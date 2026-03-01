module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error', 'Kérjük, jelentkezzen be.');
        res.redirect('/login');
    },

    ensureAdmin: (req, res, next) => {
        if (req.isAuthenticated() && req.user.role === 'admin') {
            return next();
        }
        req.flash('error', 'Nincs jogosultsága ehhez a művelethez.');
        res.redirect('back');
    },

    ensureOrg: (req, res, next) => {
        const orgId = req.params.orgId;
        if (req.user && req.user.organizationId.toString() === orgId.toString()) {
            req.orgId = BigInt(orgId);
            return next();
        }
        req.flash('error', 'Nincs hozzáférése ehhez a szervezethez.');
        res.redirect('/');
    },
};
