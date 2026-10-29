# Dynamix Forms Web

The private React/Vite workspace for creating, previewing, importing, exporting, publishing, restoring, and deleting Dynamix form schemas.

## Local development

Start the API on port 3001, then run:

```bash
npm run dev --workspace @dynamix-forms/form-builder-web
```

Vite proxies `/api` to `http://localhost:3001`. If the deployed API is not exposed through a same-origin rewrite, set `VITE_API_URL` to its HTTPS origin and set the API's `APP_ORIGIN` to the exact web origin.

Open `http://localhost:5173`, create an account, then create a form from the dashboard. You can also import [`sample-customer-intake.json`](../../examples/sample-customer-intake.json) to try every part of the editor.

## Using the builder

1. Select a field type in the left **Field palette** to add it to the main form. Click a field on the canvas to edit its label, name, validation, and other settings in the right panel.
2. To add fields inside a condition, add a **Select** or **Radio** field, then add an option in its settings. Click that option's **When …** label on the canvas. The palette now shows the selected branch and adds fields there. Click the same **When …** label again to return to the main form.
3. Use **Preview** to fill and submit a test form. Its submission JSON appears beside the form. The preview uses a searchable combobox for multi-select fields. Preview submissions stay in the browser; the builder does not store them.
4. **Save** your draft as you work. **Publish** saves any unsaved edits and creates a versioned snapshot. You can inspect history or restore an earlier version into a new draft without changing the old snapshot.

Every field name must be unique across the form, including conditional branches. Calculations can use number, currency, and other calculation fields. The editor validates a draft before preview or publication and shows schema problems so you can correct them.

## Do and don't in the builder

| Do | Don't |
| --- | --- |
| Click a **When …** branch before choosing a palette field when the new field belongs inside that condition. | Add it to the main form and expect it to move into the branch automatically. |
| Give each field a unique name across the entire form. | Reuse a name in another conditional branch. |
| Use **Preview** to check which values a form would submit, then **Save** a draft or **Publish** a version when ready. | Expect preview submissions to be stored by the builder or **Save** alone to publish a version. |
| Restore a deleted form when you still need it. | Use permanent deletion unless you intend to remove the form and its versions. |

## Features

- Opaque-cookie registration, login, logout, protected routes, and profile.
- English/Myanmar navigation and persistent light/dark theme.
- Private form dashboard and JSON import.
- Recursive visual canvas for all 14 field types, conditional branches, calculations, validation, duplication, reordering, and deletion.
- Live renderer preview using `@thuraaung2493/dynamic-form-react`.
- Optimistic draft saves, atomic publication, immutable history, version restore, and JSON export.
- Soft-deleted form recovery and explicit manual permanent deletion.

The builder stores only schema definitions. End-user submissions are outside its scope.

## Deployment

Deploy this directory and `apps/form-builder-api` as separate Vercel projects. For reliable first-party cookies, expose the API beneath the web application's `/api` path with a Vercel rewrite, or use custom web/API subdomains under the same parent site. The included `vercel.json` provides SPA history fallback while leaving `/api/*` available for that deployment rewrite.
