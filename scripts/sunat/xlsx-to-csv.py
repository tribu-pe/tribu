"""Convert SUNAT's validation workbook (Reglas de validación, .xlsx) into one UTF-8 CSV per sheet.

Usage: python scripts/sunat/xlsx-to-csv.py <workbook.xlsx> <output-dir>
Requires Python 3 and openpyxl. Prints the workbook's SHA-256 and the sheet -> file mapping.
"""

import csv
import hashlib
import json
import os
import re
import sys
import unicodedata

import openpyxl


def slug(name: str) -> str:
    """'Factura2_0' -> 'factura-2.0', 'Códigos Retorno' -> 'codigos-retorno'."""
    s = unicodedata.normalize('NFKD', name.strip()).encode('ascii', 'ignore').decode()
    s = re.sub(r'(\d)_(\d)', r'\1.\2', s)
    s = re.sub(r'([a-z])([A-Z])', r'\1-\2', s)
    s = re.sub(r'([A-Za-z])(\d)', r'\1-\2', s)
    return re.sub(r'[^A-Za-z0-9.]+', '-', s).strip('-').lower()


def cell(value) -> str:
    if value is None:
        return ''
    if hasattr(value, 'strftime'):
        return value.strftime('%Y-%m-%d')
    return str(value).replace('\r\n', '\n').replace('\r', '\n')


def main(source: str, output: str) -> None:
    os.makedirs(output, exist_ok=True)
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    sheets = []
    for sheet in workbook.worksheets:
        file_name = slug(sheet.title) + '.csv'
        rows = 0
        with open(os.path.join(output, file_name), 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f, lineterminator='\n')
            for row in sheet.iter_rows(values_only=True):
                values = [cell(v) for v in row]
                while values and values[-1] == '':
                    values.pop()
                if values:
                    writer.writerow(values)
                    rows += 1
        sheets.append({'sheet': sheet.title.strip(), 'file': file_name, 'rows': rows})
    with open(source, 'rb') as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    print(json.dumps({'sha256': digest, 'sheets': sheets}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
