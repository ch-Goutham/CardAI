const EMAIL_REGEX =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const PHONE_REGEX =
    /(?:\+?\d{1,3}[\s().-]?)?(?:\d[\s().-]?){8,14}\d/g;

const URL_REGEX =
    /(?:(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)?)/i;

const LINKEDIN_REGEX =
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+/i;

const DESIGNATION_KEYWORDS = [
    "developer",
    "engineer",
    "manager",
    "director",
    "founder",
    "co-founder",
    "ceo",
    "cto",
    "cfo",
    "coo",
    "designer",
    "architect",
    "analyst",
    "consultant",
    "officer",
    "executive",
    "lead",
    "intern",
    "specialist",
    "president",
    "vice president",
    "vp",
    "head",
    "programmer",
    "marketing",
    "sales",
    "hr",
    "human resources",
    "accountant",
    "developer",
    "administrator",
    "recruiter"
];

const COMPANY_KEYWORDS = [
    "pvt",
    "private",
    "ltd",
    "limited",
    "llp",
    "inc",
    "incorporated",
    "technologies",
    "technology",
    "solutions",
    "systems",
    "software",
    "services",
    "industries",
    "group",
    "corporation",
    "company",
    "enterprises",
    "enterprise",
    "labs",
    "studio",
    "digital"
];

const ADDRESS_KEYWORDS = [
    "road",
    "street",
    "lane",
    "avenue",
    "nagar",
    "colony",
    "sector",
    "floor",
    "building",
    "tower",
    "hyderabad",
    "telangana",
    "bangalore",
    "bengaluru",
    "chennai",
    "mumbai",
    "delhi",
    "pune",
    "india",
    "pin",
    "pincode",
    "near",
    "opposite",
    "district"
];

const LABELS = {
    phone: [
        "mobile",
        "mob",
        "phone",
        "tel",
        "telephone",
        "contact",
        "ph",
        "m"
    ],

    email: [
        "email",
        "e-mail",
        "mail",
        "e"
    ],

    website: [
        "website",
        "web",
        "site",
        "url",
        "w"
    ],

    address: [
        "address",
        "location",
        "office"
    ],

    linkedin: [
        "linkedin"
    ]
};

function normalize(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

function lower(text) {
    return normalize(text).toLowerCase();
}

function containsKeyword(text, keywords) {

    const value = lower(text);

    return keywords.some(
        keyword =>
            value === keyword ||
            value.includes(keyword)
    );
}

function removeLabel(text) {

    let value = normalize(text);

    value = value.replace(
        /^(mobile|mob|phone|tel|telephone|contact|ph|m)\s*[:\-]?\s*/i,
        ""
    );

    value = value.replace(
        /^(email|e-mail|mail|e)\s*[:\-]?\s*/i,
        ""
    );

    value = value.replace(
        /^(website|web|site|url|w)\s*[:\-]?\s*/i,
        ""
    );

    value = value.replace(
        /^(linkedin)\s*[:\-]?\s*/i,
        ""
    );

    return normalize(value);
}

function isEmail(text) {
    return EMAIL_REGEX.test(text);
}

function extractEmail(text) {

    const match = normalize(text)
        .match(EMAIL_REGEX);

    return match ? match[0] : "";
}

function extractPhones(text) {

    const matches =
        normalize(text).match(PHONE_REGEX) || [];

    return matches
        .map(item =>
            item
                .replace(/[^\d+]/g, "")
                .trim()
        )
        .filter(item => {

            const digits =
                item.replace(/\D/g, "");

            return (
                digits.length >= 10 &&
                digits.length <= 15
            );
        });
}

function extractUrl(text) {

    const match =
        normalize(text).match(URL_REGEX);

    return match ? match[0] : "";
}

function isLinkedIn(text) {
    return LINKEDIN_REGEX.test(text);
}

function cleanWebsite(value) {

    value = normalize(value);

    if (!value) {
        return "";
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }

    return `https://${value}`;
}

function getBoxInfo(box) {

    if (!Array.isArray(box) || !box.length) {

        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
    }

    const points = box
        .map(point => {

            if (
                Array.isArray(point) &&
                point.length >= 2
            ) {
                return {
                    x: Number(point[0]),
                    y: Number(point[1])
                };
            }

            return null;
        })
        .filter(Boolean);

    if (!points.length) {

        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
    }

    const xs = points.map(
        point => point.x
    );

    const ys = points.map(
        point => point.y
    );

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

function prepareLines(lines) {

    return lines
        .map((item, index) => {

            const text = normalize(
                item.text
            );

            const box = getBoxInfo(
                item.box
            );

            return {
                ...item,

                id: index,

                text,

                lower: lower(text),

                confidence:
                    Number(item.confidence) || 0,

                ...box
            };
        })
        .filter(item => item.text);
}

function sortLines(lines) {

    return [...lines].sort((a, b) => {

        if (
            Math.abs(a.y - b.y) < 20
        ) {
            return a.x - b.x;
        }

        return a.y - b.y;
    });
}

function scoreTextCandidate(item) {

    let score = item.confidence * 40;

    const text = item.text;

    if (
        text.length >= 3 &&
        text.length <= 50
    ) {
        score += 10;
    }

    if (
        /^[A-Za-z]+(?:\s+[A-Za-z.'-]+){1,3}$/.test(
            text
        )
    ) {
        score += 25;
    }

    if (
        /^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){1,3}$/.test(
            text
        )
    ) {
        score += 10;
    }

    if (
        isEmail(text) ||
        extractPhones(text).length ||
        URL_REGEX.test(text)
    ) {
        score -= 80;
    }

    if (
        containsKeyword(
            text,
            DESIGNATION_KEYWORDS
        )
    ) {
        score -= 40;
    }

    if (
        containsKeyword(
            text,
            COMPANY_KEYWORDS
        )
    ) {
        score -= 30;
    }

    if (
        containsKeyword(
            text,
            ADDRESS_KEYWORDS
        )
    ) {
        score -= 30;
    }

    return score;
}

function scoreCompanyCandidate(
    item,
    emailDomain
) {

    let score =
        item.confidence * 40;

    const text = item.text;

    if (
        containsKeyword(
            text,
            COMPANY_KEYWORDS
        )
    ) {
        score += 45;
    }

    if (
        emailDomain &&
        text
            .toLowerCase()
            .includes(emailDomain)
    ) {
        score += 30;
    }

    if (
        text.length >= 3 &&
        text.length <= 80
    ) {
        score += 10;
    }

    if (
        /^[A-Za-z0-9&.,' -]+$/.test(text)
    ) {
        score += 5;
    }

    if (
        isEmail(text) ||
        extractPhones(text).length
    ) {
        score -= 80;
    }

    if (
        containsKeyword(
            text,
            DESIGNATION_KEYWORDS
        )
    ) {
        score -= 25;
    }

    return score;
}

function scoreDesignationCandidate(item) {

    let score =
        item.confidence * 40;

    if (
        containsKeyword(
            item.text,
            DESIGNATION_KEYWORDS
        )
    ) {
        score += 55;
    }

    if (
        item.text.length <= 60
    ) {
        score += 10;
    }

    return score;
}

function scoreAddressCandidate(item) {

    let score =
        item.confidence * 30;

    if (
        containsKeyword(
            item.text,
            ADDRESS_KEYWORDS
        )
    ) {
        score += 45;
    }

    if (/\d/.test(item.text)) {
        score += 10;
    }

    if (
        item.text.length >= 8
    ) {
        score += 10;
    }

    return score;
}

function getBest(candidates) {

    if (!candidates.length) {
        return null;
    }

    return [...candidates]
        .sort(
            (a, b) =>
                b.score - a.score
        )[0];
}

function heuristicConfidence(
    score,
    max = 100
) {

    return Math.max(
        0,
        Math.min(
            0.99,
            score / max
        )
    );
}

export function extractContact(
    originalLines
) {

    const lines =
        sortLines(
            prepareLines(
                originalLines
            )
        );

    const result = {

        name: "",
        company: "",
        designation: "",
        phone: "",
        alternatePhone: "",
        email: "",
        website: "",
        linkedin: "",
        address: "",
        notes: ""
    };

    const confidence = {

        name: 0,
        company: 0,
        designation: 0,
        phone: 0,
        alternatePhone: 0,
        email: 0,
        website: 0,
        linkedin: 0,
        address: 0
    };

    const candidates = {

        name: [],
        company: [],
        designation: [],
        phone: [],
        email: [],
        website: [],
        address: []
    };

    const phones = [];

    const emails = [];

    const websites = [];

    const linkedin = [];

    /*
     * First pass:
     * deterministic information.
     */

    for (const line of lines) {

        const text = line.text;

        const email =
            extractEmail(text);

        if (email) {

            emails.push({
                value: email,
                score:
                    line.confidence * 100
            });
        }

        const foundPhones =
            extractPhones(text);

        for (const phone of foundPhones) {

            phones.push({
                value: phone,
                score:
                    line.confidence * 100
            });
        }

        const url =
            extractUrl(text);

        if (url) {

            if (isLinkedIn(text)) {

                linkedin.push({
                    value: url,
                    score:
                        line.confidence * 100
                });

            } else {

                websites.push({
                    value: url,
                    score:
                        line.confidence * 100
                });
            }
        }
    }

    /*
     * Email
     */

    if (emails.length) {

        emails.sort(
            (a, b) =>
                b.score - a.score
        );

        result.email =
            emails[0].value;

        confidence.email =
            heuristicConfidence(
                emails[0].score
            );
    }

    /*
     * Phones
     */

    phones.sort(
        (a, b) =>
            b.score - a.score
    );

    if (phones[0]) {

        result.phone =
            phones[0].value;

        confidence.phone =
            heuristicConfidence(
                phones[0].score
            );
    }

    if (phones[1]) {

        result.alternatePhone =
            phones[1].value;

        confidence.alternatePhone =
            heuristicConfidence(
                phones[1].score
            );
    }

    /*
     * Website
     */

    if (websites.length) {

        websites.sort(
            (a, b) =>
                b.score - a.score
        );

        result.website =
            cleanWebsite(
                websites[0].value
            );

        confidence.website =
            heuristicConfidence(
                websites[0].score
            );
    }

    /*
     * LinkedIn
     */

    if (linkedin.length) {

        result.linkedin =
            linkedin[0].value;

        confidence.linkedin =
            heuristicConfidence(
                linkedin[0].score
            );
    }

    /*
     * Email domain helps identify company.
     */

    let emailDomain = "";

    if (result.email) {

        emailDomain =
            result.email
                .split("@")[1]
                ?.split(".")[0]
                ?.toLowerCase() || "";
    }

    /*
     * Candidate classification.
     */

    for (const line of lines) {

        const text = line.text;

        const cleaned =
            removeLabel(text);

        /*
         * Name
         */

        const nameScore =
            scoreTextCandidate(line);

        if (nameScore > 20) {

            candidates.name.push({
                value: cleaned,
                score: nameScore
            });
        }

        /*
         * Company
         */

        const companyScore =
            scoreCompanyCandidate(
                line,
                emailDomain
            );

        if (companyScore > 20) {

            candidates.company.push({
                value: cleaned,
                score: companyScore
            });
        }

        /*
         * Designation
         */

        const designationScore =
            scoreDesignationCandidate(
                line
            );

        if (designationScore > 30) {

            candidates.designation.push({
                value: cleaned,
                score: designationScore
            });
        }

        /*
         * Address
         */

        const addressScore =
            scoreAddressCandidate(
                line
            );

        if (addressScore > 25) {

            candidates.address.push({
                value: cleaned,
                score: addressScore
            });
        }
    }

    /*
     * Remove duplicates.
     */

    for (const key of Object.keys(candidates)) {

        candidates[key] =
            candidates[key].filter(
                (item, index, array) =>
                    index ===
                    array.findIndex(
                        other =>
                            other.value.toLowerCase() ===
                            item.value.toLowerCase()
                    )
            );
    }

    /*
     * Best name.
     */

    const bestName =
        getBest(
            candidates.name
        );

    if (bestName) {

        result.name =
            bestName.value;

        confidence.name =
            heuristicConfidence(
                bestName.score,
                100
            );
    }

    /*
     * Best company.
     */

    const bestCompany =
        getBest(
            candidates.company
        );

    if (bestCompany) {

        result.company =
            bestCompany.value;

        confidence.company =
            heuristicConfidence(
                bestCompany.score,
                120
            );
    }

    /*
     * Best designation.
     */

    const bestDesignation =
        getBest(
            candidates.designation
        );

    if (bestDesignation) {

        result.designation =
            bestDesignation.value;

        confidence.designation =
            heuristicConfidence(
                bestDesignation.score,
                120
            );
    }

    /*
     * Address can consist of multiple lines.
     */

    const addressCandidates =
        candidates.address
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(0, 3);

    if (addressCandidates.length) {

        result.address =
            addressCandidates
                .map(item => item.value)
                .join(", ");

        confidence.address =
            heuristicConfidence(
                addressCandidates[0].score,
                100
            );
    }

    /*
     * Label-aware extraction.
     *
     * Example:
     *
     * M: +91 9876543210
     * E: abc@gmail.com
     * W: www.example.com
     */

    for (const line of lines) {

        const text =
            lower(line.text);

        if (
            LABELS.phone.some(
                label =>
                    text.startsWith(
                        `${label}:`
                    ) ||
                    text.startsWith(
                        `${label} `
                    )
            )
        ) {

            const values =
                extractPhones(line.text);

            if (
                values.length &&
                !result.phone
            ) {

                result.phone =
                    values[0];

                confidence.phone =
                    Math.max(
                        confidence.phone,
                        line.confidence
                    );
            }
        }

        if (
            LABELS.email.some(
                label =>
                    text.startsWith(
                        `${label}:`
                    ) ||
                    text.startsWith(
                        `${label} `
                    )
            )
        ) {

            const email =
                extractEmail(
                    line.text
                );

            if (
                email &&
                !result.email
            ) {

                result.email =
                    email;

                confidence.email =
                    Math.max(
                        confidence.email,
                        line.confidence
                    );
            }
        }

        if (
            LABELS.website.some(
                label =>
                    text.startsWith(
                        `${label}:`
                    ) ||
                    text.startsWith(
                        `${label} `
                    )
            )
        ) {

            const url =
                extractUrl(
                    line.text
                );

            if (
                url &&
                !result.website
            ) {

                result.website =
                    cleanWebsite(url);

                confidence.website =
                    Math.max(
                        confidence.website,
                        line.confidence
                    );
            }
        }
    }

    /*
     * Do not allow obvious contact values
     * to become names/companies.
     */

    if (
        result.name &&
        (
            isEmail(result.name) ||
            extractPhones(result.name).length ||
            URL_REGEX.test(result.name)
        )
    ) {

        result.name = "";

        confidence.name = 0;
    }

    if (
        result.company &&
        (
            isEmail(result.company) ||
            extractPhones(result.company).length
        )
    ) {

        result.company = "";

        confidence.company = 0;
    }

    return {
        data: result,
        confidence,
        candidates
    };
}