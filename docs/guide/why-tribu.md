# Why Tribu

Issuing an electronic Invoice to SUNAT takes many steps. Some libraries give you building blocks for them, and you still put them together yourself. Tribu does every step and gives you one result.

## The steps, side by side

| Step | Without Tribu | With Tribu |
|---|---|---|
| Amounts | You compute Unit Value, IGV, totals and rounding, and keep them consistent within SUNAT's tolerance | You give `price` or `value`; Tribu derives everything |
| IGV rate | You type the rate and remember when it changes | It comes from your IGV Regime and the issue date |
| SUNAT codes | You look up catalog codes (document type, identity, affectation, unit…) and type them | Constants: `Unit.Service`, `Affectation.Exempt`, `Reason.Void` |
| Rules | You find out what is wrong when SUNAT rejects it, and the Number may already be used | Checked before sending, with the SUNAT rule, the reason and how to fix it |
| XML | You write UBL 2.1 by hand or with a template, in the exact order SUNAT expects | Built for you |
| Signature | You set up XMLDSig with your Certificate | Signed for you; the Certificate is checked at startup |
| Sending | You build the ZIP with SUNAT's file name, the SOAP envelope and WS-Security | One call: `sunat.invoice(...)` |
| SUNAT's answer | You unzip the CDR, parse its XML and interpret the return code | `record.status`: `accepted`, `rejected`, … with the Observations listed |
| Lost answers | You decide whether to send again and risk a duplicate | Never re-sends blindly; the Record ends `unconfirmed` and you decide |
| Summaries and voiding | You build different XML formats, get a Ticket and poll it | `dailySummary()`, `voidDocuments()`, `waitFor()` |
| What to keep | You decide what the law requires you to save | One plain JSON `record` with the XML, the CDR, the QR text and the status |
| Testing | You need a SUNAT test account or your own mocks | `fakeSunat()` accepts, rejects or fails on demand |

## The same Invoice

**Without Tribu**, roughly:

1. Compute each line's value, IGV and totals, and round them.
2. Fill a UBL 2.1 XML template with those amounts and the SUNAT codes.
3. Sign the XML with your Certificate (XMLDSig).
4. Zip it as `RUC-01-F001-1.zip`.
5. Wrap it in a SOAP `sendBill` envelope with your SOL credentials.
6. Post it, then unzip the answer and read the CDR's return code.
7. Decide what that code means and what to save.

**With Tribu:**

```ts
const { record } = await sunat.invoice({
  customer: { ruc: '20123456786', name: 'CLIENTE SAC' },
  items: [{ description: 'Teclado', quantity: 2, price: 118 }],
});

await db.save(record);
record.status.code; // 'accepted'
```

## What Tribu does not do yet

Tribu is young and was tested only in SUNAT's beta environment. See [What v0.1 covers](../../README.md#what-v01-covers) and [Trying it in production](production.md).

---

[← Guide](README.md)
