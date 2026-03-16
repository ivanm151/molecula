export const dbService = {
    async getMolecules() {
        try {
            const res = await fetch("/api/db", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                return { ok: false, error: "Invalid response format" };
            }

            const result = await res.json();
            return result;
        } catch (err) {
            return { ok: false, error: err.message || "Network error" };
        }
    },

    async addMolecule(smiles) {
        try {
            const res = await fetch("/api/addMolecule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ smiles }),
            });

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                return { ok: false, error: "Invalid response format" };
            }

            const result = await res.json();
            return result;
        } catch (err) {
            return { ok: false, error: err.message || "Network error" };
        }
    },
};