import json
import os
import re
from html import escape

import frappe
from frappe.utils import get_url, strip_html

# The SPA owns its own routing; never cache the boot shell.
no_cache = 1


def get_context(context):
	return get_context_for_spa(context)


def get_context_for_spa(context):
	"""Serve the built React SPA shell with the session CSRF token injected.

	The front-end is built by Vite into public/frontend (served by Frappe
	at /assets/izensphere_stay_and_dine/frontend/). We read that index.html at request time — so
	asset hashes never need to be hard-coded — and inject window.csrf_token so
	the SPA can POST to whitelisted endpoints once the user is logged in.
	"""
	index_path = frappe.get_app_path("izensphere_stay_and_dine", "public", "frontend", "index.html")
	if not os.path.exists(index_path):
		frappe.throw(
			frappe._(
				"Izensphere Stay and Dine front-end is not built. Run "
				"<code>npm run build</code> in the frontend folder."
			),
			title="Izensphere Stay and Dine not built",
		)

	with open(index_path, encoding="utf-8") as f:
		html = f.read()

	csrf = frappe.sessions.get_csrf_token()
	site = json.dumps(frappe.local.site).replace("<", "\\u003c")
	boot = f'<script>window.csrf_token = "{csrf}"; window.kamra_site = {site};</script>'
	html = html.replace("</head>", boot + "</head>", 1)
	html = _with_meta(html, frappe.request.path if frappe.request else "/")

	context.spa_html = html
	context.no_cache = 1
	return context


_GUEST = re.compile(r"^/(?:$|(?:(?:kamra|izensphere-stay-and-dine|stay-and-dine)/)?book(?:/|$)|(?:(?:kamra|izensphere-stay-and-dine|stay-and-dine)/)?stay/([^/]+))")


def _with_meta(html: str, path: str) -> str:
	match = _GUEST.match(path or "/")
	if not match:
		return html.replace("</head>", '<meta name="robots" content="noindex" /></head>', 1)
	meta = _guest_meta(match.group(1))
	if not meta:
		return html
	if meta.get("lang"):
		html = re.sub(r'<html lang="[^"]*"', f'<html lang="{escape(meta["lang"])}"', html, count=1)
	html = re.sub(r"<title>.*?</title>", f"<title>{escape(meta['title'])}</title>", html, count=1, flags=re.S)
	html = re.sub(r'<meta\s+name="description"[^>]*>', "", html, count=1, flags=re.S)
	tags = [
		f'<meta name="description" content="{escape(meta["description"])}" />',
		f'<meta property="og:title" content="{escape(meta["title"])}" />',
		f'<meta property="og:description" content="{escape(meta["description"])}" />',
		f'<meta property="og:url" content="{escape(get_url(path))}" />',
		'<meta property="og:type" content="website" />',
		f'<link rel="canonical" href="{escape(get_url(path))}" />',
	]
	if meta.get("image"):
		image = escape(get_url(meta["image"]) if meta["image"].startswith("/") else meta["image"])
		tags += [f'<meta property="og:image" content="{image}" />',
		         '<meta name="twitter:card" content="summary_large_image" />']
	return html.replace("</head>", "".join(tags) + "</head>", 1)


def _guest_meta(slug: str | None) -> dict | None:
	from izensphere_stay_and_dine.booking_slugs import property_for_slug, resolve_public_slug

	listing = None
	try:
		if slug:
			scope = resolve_public_slug(slug)
			name = scope["property"]
			listing = scope.get("room_type_name")
		else:
			name = property_for_slug(frappe.form_dict.get("property") or "")
			if not name:
				live = frappe.get_all("Property", {"booking_engine_enabled": 1, "disabled": 0},
				                      pluck="name", limit=2)
				if len(live) != 1:
					return None
				name = live[0]
	except frappe.DoesNotExistError:
		frappe.clear_last_message()
		return None
	prop = frappe.get_cached_doc("Property", name)
	place = ", ".join(x for x in (prop.city, prop.state) if x)
	title = prop.get("meta_title") or (
		f"{prop.property_name}{', ' + place if place else ''} · Book direct")
	if listing:
		title = f"{listing} · {prop.property_name}"
	description = (prop.get("meta_description")
	               or strip_html(prop.get("showcase_description") or "").strip()
	               or f"Book {prop.property_name}{' in ' + place if place else ''} directly with the hotel.")
	return {"title": title, "description": " ".join(description.split())[:160],
	        "lang": prop.get("booking_language"),
	        "image": prop.get("og_image") or prop.get("hero_image") or prop.get("logo_url")}
