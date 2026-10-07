const ConfidenceBadge = ({
    value
}) => {

    const percent =
        Math.round(
            (Number(value) || 0) * 100
        );

    let label =
        "Low confidence";

    if (percent >= 85) {
        label = "High confidence";
    } else if (percent >= 60) {
        label = "Medium confidence";
    }

    return (
        <span
            className={`confidence confidence-${percent >= 85
                ? "high"
                : percent >= 60
                    ? "medium"
                    : "low"
                }`}
        >
            {label} {percent}%
        </span>
    );
};

export default ConfidenceBadge;