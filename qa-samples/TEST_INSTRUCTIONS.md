# Sadi book list comparison samples

Open the local [Koha OPAC](http://127.0.0.1:8081/cgi-bin/koha/opac-main.pl), choose **Check book list**, and drop one `book-list.*` file at a time. The PDF, DOCX, XLSX, CSV, JSON, TXT, and MRK files contain the same three entries. Do not upload the ZIP itself; extract it first.

Expected results for each file:

| Supplied entry | Expected result | Why |
| --- | --- | --- |
| Computer Networks, Andrew S. Tanenbaum, 9780136764052 | Already in catalog | Exact ISBN matches Koha record 6 |
| Computer Networks, Andrew S. Tanenbaum, 9780132126953 | Possible match | Title and author match, ISBN differs |
| The Paper Moon Atlas of 2099, Fictional Writer | No match found | Deliberately fictional title |

The files are synthetic test data. On 2026-10-11, the parser and Koha comparison API passed for all seven formats. The local Koha OPAC browser also accepted all seven through **Choose files** and displayed 21 correct results; its downloaded CSV contained the same 21 results. See `browser-check-1.4.6.png` and `browser-results-1.4.6.csv`. An OS-level drag gesture remains to be checked separately.
