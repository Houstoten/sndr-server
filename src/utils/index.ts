import { validateToken, getUserProfile } from './auth'
import * as R from 'rambda'
import { Request, Response } from 'express';
import { Tokens } from './auth/types';
import { Claims } from '../context/types';

export const parseCookies = (request: Request): Request => {
    const list = {}, rc = request.headers.cookie;

    rc && rc.split(';').forEach(function (cookie: any) {
        const parts = cookie.split('=');
        //@ts-ignore
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return R.set(R.lensProp('cookies'), list, request);
}

export const getClaims = async (req: Request): Promise<Claims | null> => {

    if (!req) {
        return null;
    }
    const { cookies: { accessToken, idToken } } = req

    const validAccessToken = await validateToken({ accessToken }, process.env.GOOGLE_CLIENT_ID || '')
    const validIdToken = await validateToken({ idToken }, process.env.GOOGLE_CLIENT_ID || '')
    const userProfile = await getUserProfile(accessToken);

    if (validAccessToken && validIdToken && userProfile) {

        return userProfile;
    }

    return null;
}

export const setCookies = (_response: Response) => (tokens: { credentials: Tokens }) => {
    const { credentials: { access_token, refresh_token, id_token } } = tokens

    _response.cookie('accessToken', access_token, { httpOnly: true });
    _response.cookie('refreshToken', refresh_token, { httpOnly: true });
    _response.cookie('idToken', id_token, { httpOnly: true });
}

