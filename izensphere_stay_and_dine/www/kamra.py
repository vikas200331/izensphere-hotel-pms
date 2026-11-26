import frappe

no_cache = 1


def get_context(context):
	if frappe.request:
		path = frappe.request.path or ""
		if path in ("/kamra", "/kamra/"):
			frappe.local.flags.redirect_location = "/izensphere-stay-and-dine"
			raise frappe.Redirect
		elif path.startswith("/kamra/"):
			frappe.local.flags.redirect_location = path.replace("/kamra", "/izensphere-stay-and-dine", 1)
			raise frappe.Redirect

	from izensphere_stay_and_dine.www.izensphere_stay_and_dine import get_context_for_spa
	return get_context_for_spa(context)
