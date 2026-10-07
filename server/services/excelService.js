import XLSX from "xlsx";

export const createExcelBuffer = (contacts) => {
    const rows = contacts.map((contact) => ({
        Date: contact.createdAt
            ? new Date(contact.createdAt).toLocaleString("en-IN")
            : "",

        Name: contact.name || "",

        Company: contact.company || "",

        Designation: contact.designation || "",

        Phone: contact.phone || "",

        "Alternate Phone": contact.alternatePhone || "",

        Email: contact.email || "",

        Website: contact.website || "",

        LinkedIn: contact.linkedin || "",

        Address: contact.address || "",

        Notes: contact.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
        { wch: 22 },
        { wch: 25 },
        { wch: 30 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 35 },
        { wch: 35 },
        { wch: 35 },
        { wch: 45 },
        { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Visiting Cards"
    );

    return XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
    });
};