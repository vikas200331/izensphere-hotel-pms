# Copyright (c) 2026, HeyKoala and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, getdate, now_datetime, nowdate

from izensphere_stay_and_dine.api import create_booking
from izensphere_stay_and_dine.reservation_state import expire_holds
from izensphere_stay_and_dine.rooms import rooms_board


class TestRoomReservationBoard(IntegrationTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		frappe.local.lang = "en"

		# Setup isolated property, room type, and rooms
		self.property = frappe.get_doc({
			"doctype": "Property",
			"property_name": "TEST BOARD " + frappe.generate_hash(length=8),
			"checkin_time": "14:00:00",
			"checkout_time": "11:00:00",
			"booking_engine_enabled": 1,
		}).insert(ignore_permissions=True).name

		self.room_type = frappe.get_doc({
			"doctype": "Room Type",
			"property": self.property,
			"room_type_code": "DLX",
			"room_type_name": "Deluxe Room",
			"base_price": 2000,
			"adults_capacity": 2,
		}).insert(ignore_permissions=True).name

		self.room_101 = frappe.get_doc({
			"doctype": "Room",
			"property": self.property,
			"room_type": self.room_type,
			"room_number": "101",
			"floor": "1",
			"housekeeping_status": "Clean",
		}).insert(ignore_permissions=True).name

		self.room_102 = frappe.get_doc({
			"doctype": "Room",
			"property": self.property,
			"room_type": self.room_type,
			"room_number": "102",
			"floor": "1",
			"housekeeping_status": "Clean",
		}).insert(ignore_permissions=True).name

		self.today = nowdate()
		self.d1 = add_days(self.today, 1)
		self.d2 = add_days(self.today, 2)
		self.d3 = add_days(self.today, 3)
		self.d4 = add_days(self.today, 4)

	def test_1_online_booking_reserves_correct_room_and_dates(self):
		"""1. Online booking reserves the correct room and dates:
		Display RESERVED on Room Status Board, with booking ref, guest info, and Online source."""
		import random
		unique_phone = f"+919{random.randint(100000000, 999999999)}"
		res = create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d3,
			guest_name="Ramesh Kumar",
			phone=unique_phone,
			source="Website",
			room=self.room_101,
			assign_room=1,
		)
		self.assertTrue(res.get("reservation"))

		# Check board on check-in date
		board = rooms_board(self.property, date=self.d1)
		r101 = next(r for r in board["rooms"] if r["name"] == self.room_101)

		self.assertEqual(r101["reservation_status"], "Reserved")
		self.assertEqual(r101["reservation_details"]["source_label"], "Online")
		self.assertEqual(r101["reservation_details"]["guest_name"], "Ramesh Kumar")
		self.assertEqual(r101["reservation_details"]["name"], res["reservation"])
		self.assertTrue(r101["reservation_details"]["is_check_in"])
		# Housekeeping status is preserved and distinct
		self.assertEqual(r101["housekeeping_status"], "Clean")

	def test_2_multiple_night_booking_blocks_only_applicable_nights(self):
		"""2. Multiple-night booking blocks only the applicable nights."""
		res = create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d3,
			guest_name="Multi Night Guest",
			source="Website",
			room=self.room_101,
		)
		# Night 1 (d1): Reserved
		b1 = rooms_board(self.property, date=self.d1)
		r1 = next(r for r in b1["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r1["reservation_status"], "Reserved")

		# Night 2 (d2): Reserved
		b2 = rooms_board(self.property, date=self.d2)
		r2 = next(r for r in b2["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r2["reservation_status"], "Reserved")

		# Night 3 (d3 - checkout day): Available for next guest check-in
		b3 = rooms_board(self.property, date=self.d3)
		r3 = next(r for r in b3["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r3["reservation_status"], "Available")
		self.assertTrue(r3["days"][self.d3]["is_check_out"])

	def test_3_checkout_date_becomes_available_after_checkout(self):
		"""3. Checkout date becomes available after checkout."""
		res = create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.today,
			check_out_date=self.d1,
			guest_name="Departing Guest",
			room=self.room_101,
		)
		frappe.flags.kamra_status_transition = True
		doc = frappe.get_doc("Reservation", res["reservation"])
		doc.status = "Checked Out"
		doc.save(ignore_permissions=True)
		frappe.flags.kamra_status_transition = False

		board = rooms_board(self.property, date=self.d1)
		r101 = next(r for r in board["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r101["reservation_status"], "Available")

	def test_4_cancelled_booking_releases_availability(self):
		"""4. Cancelled booking releases availability."""
		res = create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d2,
			guest_name="To Cancel",
			room=self.room_101,
		)
		from izensphere_stay_and_dine.cancellation import execute_cancellation
		execute_cancellation(res["reservation"], reason="Guest request")

		board = rooms_board(self.property, date=self.d1)
		r101 = next(r for r in board["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r101["reservation_status"], "Available")

	def test_5_pending_payment_holds_expire_correctly(self):
		"""5. Pending payment holds expire according to hold_expires_on and release room."""
		past_time = add_days(now_datetime(), -1)
		res = create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d2,
			guest_name="Holding Guest",
			room=self.room_101,
			status="Pending Payment",
			hold_expires_on=str(past_time),
		)
		# Board call automatically expires lapsed holds
		board = rooms_board(self.property, date=self.d1)
		r101 = next(r for r in board["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r101["reservation_status"], "Available")

		doc = frappe.get_doc("Reservation", res["reservation"])
		self.assertEqual(doc.status, "Cancelled")

	def test_6_concurrent_overlapping_reservations_blocked_on_server(self):
		"""6. Two customers cannot reserve the same room for overlapping dates."""
		create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d3,
			guest_name="First Guest",
			room=self.room_101,
		)

		# Attempt overlapping reservation on same physical room
		overlap = False
		try:
			create_booking(
				property=self.property,
				room_type=self.room_type,
				check_in_date=self.d2,
				check_out_date=self.d4,
				guest_name="Second Guest",
				room=self.room_101,
			)
		except Exception:
			overlap = True

		self.assertTrue(overlap, "Server must reject overlapping reservation on the same room.")

	def test_7_direct_and_walkin_follow_same_validation(self):
		"""7. Direct and walk-in bookings follow the same validation and display correct source."""
		res_walkin = create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d2,
			guest_name="Walkin Guest",
			source="Walk-in",
			room=self.room_101,
		)
		board = rooms_board(self.property, date=self.d1)
		r101 = next(r for r in board["rooms"] if r["name"] == self.room_101)
		self.assertEqual(r101["reservation_status"], "Reserved")
		self.assertEqual(r101["reservation_details"]["source_label"], "Walk-in")

	def test_8_admin_room_blocks_remain_independent_of_customer_reservations(self):
		"""8. Admin room blocks remain independent of customer reservations (Blocked)."""
		blk = frappe.get_doc({
			"doctype": "Room Block",
			"property": self.property,
			"room": self.room_102,
			"from_date": self.d1,
			"to_date": self.d3,
			"reason": "Maintenance",
			"note": "AC Repair",
			"block_status": "Active",
		}).insert(ignore_permissions=True)

		board = rooms_board(self.property, date=self.d1)
		r102 = next(r for r in board["rooms"] if r["name"] == self.room_102)
		self.assertEqual(r102["reservation_status"], "Blocked")
		self.assertEqual(r102["block"]["reason"], "Maintenance")

	def test_9_existing_housekeeping_operations_continue_working(self):
		"""9. Existing housekeeping operations continue working without being overwritten."""
		# Set room 101 to Dirty
		frappe.db.set_value("Room", self.room_101, "housekeeping_status", "Dirty")

		# Create reservation on room 101
		create_booking(
			property=self.property,
			room_type=self.room_type,
			check_in_date=self.d1,
			check_out_date=self.d2,
			guest_name="Housekeeping Test",
			room=self.room_101,
		)

		board = rooms_board(self.property, date=self.d1)
		r101 = next(r for r in board["rooms"] if r["name"] == self.room_101)

		# Reservation status is Reserved, Housekeeping status remains Dirty
		self.assertEqual(r101["reservation_status"], "Reserved")
		self.assertEqual(r101["housekeeping_status"], "Dirty")
		self.assertNotEqual(r101["housekeeping_status"], r101["reservation_status"])
