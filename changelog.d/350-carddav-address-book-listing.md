**A CardDAV server that reads the standard now fills the address book.** To read a whole address
book plMail sent an `addressbook-query` REPORT with no filter, and RFC 6352 §10.3 requires one.
Servers built on go-webdav, Meerkat CRM among them, answer that request with an empty list, and
plMail took the empty list at face value: contacts never arrived, and a book that had already
synced could be cleared by the first sync. The full listing is now a Depth-1 PROPFIND of the book
followed by one `addressbook-multiget` for the cards themselves. Nothing is filtered, so nothing is
left out by a filter, and a listing the server cuts short is no longer read as the whole book.
No schema change.
[#350](https://github.com/karatektus/pl_mail/issues/350), reported by @KieranBeals.
