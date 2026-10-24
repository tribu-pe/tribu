# UBL XML is built by typed functions, not templates

An implementation builds XML with large, near-duplicate Twig templates with autoescape off, and amount formatting depends on remembering a filter. Tribu builds each UBL part with a typed function shared across document types, so escaping and amount formatting happen by construction. Each function cites the annex field and XPath it produces. We lose the visual resemblance between a template and SUNAT's sample XML; golden tests with the expected XML next to each case compensate for it.
