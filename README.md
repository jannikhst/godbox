# GoDBox
This project is used to **save invoices GoBD-compliant** without third-party software.
A **Raspberry Pi Zero W** with NodeJS and its PM2 Manager is used for this.
The device is sealed and thus does not allow any unauthorized changes to the data. It behaves **similarly to WORM storage**.
The only way to read and write data is the open API in the intranet or the defined server with which the raspberry automatically connects via web socket.
Documents are hashed and filed together with information about author and time.
Once written, data cannot be erased or altered without breaking the seal. GoBD conformity is thus ensured.

This project is very lightweight to run on small devices.
