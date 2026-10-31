# Trying it in production

> [!WARNING]
> Tribu has only been tested against SUNAT's **beta** environment. Every Document you issue in production is **legally binding**. Try it there only if you accept that risk, and start small.

If you do, please tell us how it went, even if everything worked: [open a production report](https://github.com/tribu-pe/tribu/issues/new?template=production-report.md). That is how Tribu gets verified.

## What you need

From SUNAT's documentation, summarized in [sunat-facts-2026-10.md](../research/sunat-facts-2026-10.md):

- **A RUC and a SOL user.** SUNAT's web service manual asks for a *secondary* SOL user with the profile for sending electronic documents. *Unconfirmed* for the sending service (it is documented for the lookup service).
- **A digital Certificate** from a provider in INDECOPI's registry (IOFE), **registered with SUNAT through SOL**. Otherwise SUNAT answers ERROR 2325 (2326 if it was deregistered). SUNAT offers a free *Certificado Digital Tributario* to eligible taxpayers until 2027-12-31 (R.S. 038-2020).
- **To issue directly to SUNAT.** If your RUC issues through an OSE, SUNAT rejects direct submissions with ERROR 1078.

## Steps

1. **Make it work in beta first** with your own code, as in the [Quick start](../../README.md#quick-start).
2. **Switch to production.** Remove `env: 'beta'` (production is the default) or set `SUNAT_ENV=production`. Pass your SOL user (without the RUC) and password through `SUNAT_SOL_USER` and `SUNAT_SOL_PASSWORD`, and your `.pfx` with its passphrase.
3. **Issue one low-value Document** to a Customer you trust, or to yourself.
4. **Check the result:** `record.status.code` is `'accepted'` and `record.cdr` holds SUNAT's answer. You can also look the Document up in SUNAT's SOL portal.
5. **Save every Record**, accepted or not. You must keep the XML and the CDR.

Never put your SOL password, `.pfx` or passphrase in your code, your repository or your logs.

## Not verified in production yet

Beta could not answer these ([Milestone 0 results](../research/milestone-0-results.md)). If you see one of them happen, your report is especially valuable.

- **The production address.** Tribu sends to `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService`. The repository does not yet cite an official source for it.
- **Rejections that arrive as a SOAP fault.** Does SUNAT keep the Number as used? Tribu assumes it does.
- **Sending the same Document twice.** Beta accepts it again. Whether production answers with a duplicate code such as 1033 is *unconfirmed*.
- **Recovering a lost Receipt answer.** Tribu stops and lets you decide.
- **Rate limits.** Beta refuses requests sent back to back. Production is unknown.

---

[← Guide](README.md)
