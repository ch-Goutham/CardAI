import ConfidenceBadge
    from "./ConfidenceBadge";

const fields = [
    {
        key: "name",
        label: "Name"
    },
    {
        key: "company",
        label: "Company"
    },
    {
        key: "designation",
        label: "Designation"
    },
    {
        key: "phone",
        label: "Phone"
    },
    {
        key: "alternatePhone",
        label: "Alternate Phone"
    },
    {
        key: "email",
        label: "Email"
    },
    {
        key: "website",
        label: "Website"
    },
    {
        key: "linkedin",
        label: "LinkedIn"
    },
    {
        key: "address",
        label: "Address"
    },
    {
        key: "notes",
        label: "Notes"
    }
];


const ContactForm = ({
    data,
    confidence,
    onChange,
    onSave,
    saving
}) => {

    if (!data) {
        return null;
    }


    return (
        <div className="contact-card">

            <div className="form-header">

                <div>

                    <h2>
                        Verify Contact
                    </h2>

                    <p>
                        Review the automatically
                        extracted information before
                        saving.
                    </p>

                </div>

            </div>


            <div className="form-grid">

                {fields.map(
                    ({
                        key,
                        label
                    }) => (

                        <div
                            className={
                                key === "address" ||
                                    key === "notes"
                                    ? "field full"
                                    : "field"
                            }
                            key={key}
                        >

                            <div className="field-header">

                                <label>
                                    {label}
                                </label>

                                {confidence?.[key] !==
                                    undefined && (

                                        <ConfidenceBadge
                                            value={
                                                confidence[key]
                                            }
                                        />

                                    )}

                            </div>


                            {key === "address" ||
                                key === "notes" ? (

                                <textarea
                                    value={
                                        data[key] || ""
                                    }
                                    onChange={(event) =>
                                        onChange(
                                            key,
                                            event.target.value
                                        )
                                    }
                                    rows={3}
                                />

                            ) : (

                                <input
                                    type={
                                        key === "email"
                                            ? "email"
                                            : "text"
                                    }
                                    value={
                                        data[key] || ""
                                    }
                                    onChange={(event) =>
                                        onChange(
                                            key,
                                            event.target.value
                                        )
                                    }
                                />

                            )}

                        </div>

                    )
                )}

            </div>


            <button
                className="save-button"
                onClick={onSave}
                disabled={saving}
            >

                {saving
                    ? "Saving..."
                    : "Save Contact"}

            </button>

        </div>
    );
};

export default ContactForm;