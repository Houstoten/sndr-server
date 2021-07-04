const passport = require('passport');

const { Strategy: GoogleTokenStrategy } = require('passport-google-token');

// GOOGLE STRATEGY
const GoogleTokenStrategyCallback = (
    accessToken: any,
    refreshToken: any,
    profile: any,
    done: (arg0: null, arg1: { accessToken: any; refreshToken: any; profile: any; }) => any
) => done(null, {
    accessToken,
    refreshToken,
    profile,
});

passport.use(new GoogleTokenStrategy({
    clientID: '629755736096-4nfiv64cnmk3jiuf85uvbj6fbhc79r2h.apps.googleusercontent.com',
    clientSecret: 'hiGdSygKCexMDFEKnkJJPfWH',
}, GoogleTokenStrategyCallback));

export const authenticateGoogle = (req: any, res: any) => new Promise((resolve, reject) => {
    passport.authenticate('google-token', { session: false }, (err: any, data: any, info: any) => {
        if (err) reject(err);

        resolve({ data, info });
    })(req, res);
});

