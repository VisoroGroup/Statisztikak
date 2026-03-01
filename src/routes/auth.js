const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');

// Login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect(`/${req.user.organizationId.toString()}/statistics`);
    }
    res.render('auth/login', {
        title: 'Bejelentkezés',
        layout: 'layouts/auth',
    });
});

// Login POST
router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true,
    }),
    (req, res) => {
        res.redirect(`/${req.user.organizationId.toString()}/statistics`);
    }
);

// Register page
router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect(`/${req.user.organizationId.toString()}/statistics`);
    }
    res.render('auth/register', {
        title: 'Regisztráció',
        layout: 'layouts/auth',
    });
});

// Register POST
router.post('/register', [
    body('name').trim().isLength({ min: 2 }).withMessage('A név legalább 2 karakter legyen.'),
    body('email').isEmail().normalizeEmail().withMessage('Érvényes email címet adjon meg.'),
    body('password').isLength({ min: 6 }).withMessage('A jelszó legalább 6 karakter legyen.'),
    body('password2').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('A jelszavak nem egyeznek.');
        }
        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('auth/register', {
            title: 'Regisztráció',
            layout: 'layouts/auth',
            errors: errors.array(),
            name: req.body.name,
            email: req.body.email,
        });
    }

    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return res.render('auth/register', {
                title: 'Regisztráció',
                layout: 'layouts/auth',
                errors: [{ msg: 'Ez az email cím már regisztrálva van.' }],
                name,
                email,
            });
        }

        // Get default organization
        const org = await prisma.organization.findFirst();
        if (!org) {
            req.flash('error', 'Nincs szervezet konfigurálva. Futtassa a seed-et.');
            return res.redirect('/register');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Determine role: first user is admin
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'admin' : 'user';

        await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                organizationId: org.id,
                role,
            },
        });

        req.flash('success', 'Sikeres regisztráció! Most már bejelentkezhet.');
        res.redirect('/login');
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error', 'Hiba történt a regisztráció során.');
        res.redirect('/register');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        req.flash('success', 'Sikeresen kijelentkezett.');
        res.redirect('/login');
    });
});

module.exports = router;
