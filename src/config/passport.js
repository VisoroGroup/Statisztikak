const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const prisma = require('./database');

module.exports = function (passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                const user = await prisma.user.findUnique({
                    where: { email: email.toLowerCase() },
                    include: { organization: true },
                });

                if (!user) {
                    return done(null, false, { message: 'Hibás email cím vagy jelszó.' });
                }

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return done(null, false, { message: 'Hibás email cím vagy jelszó.' });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id },
                include: { organization: true },
            });
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};
