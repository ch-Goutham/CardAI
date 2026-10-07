function ExcelTable({
    contacts,
    loading,
    onDownload,
}) {
    return (
        <section className="excel-section">

            <div className="excel-header">

                <div>
                    <h2>Saved Visiting Cards</h2>

                    <p>
                        {contacts.length} contact
                        {contacts.length !== 1
                            ? "s"
                            : ""}
                    </p>
                </div>

                <button
                    className="download-button"
                    onClick={onDownload}
                    disabled={contacts.length === 0}
                >
                    Download Excel
                </button>

            </div>

            {loading ? (
                <p>Loading contacts...</p>
            ) : contacts.length === 0 ? (
                <div className="empty-state">
                    No contacts saved yet.
                </div>
            ) : (
                <div className="table-wrapper">

                    <table>

                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Company</th>
                                <th>Designation</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Website</th>
                                <th>Address</th>
                            </tr>
                        </thead>

                        <tbody>

                            {contacts.map((contact) => (
                                <tr key={contact._id}>

                                    <td>
                                        {contact.name || "-"}
                                    </td>

                                    <td>
                                        {contact.company || "-"}
                                    </td>

                                    <td>
                                        {contact.designation || "-"}
                                    </td>

                                    <td>
                                        {contact.phone || "-"}
                                    </td>

                                    <td>
                                        {contact.email || "-"}
                                    </td>

                                    <td>
                                        {contact.website || "-"}
                                    </td>

                                    <td>
                                        {contact.address || "-"}
                                    </td>

                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>
            )}

        </section>
    );
}

export default ExcelTable;