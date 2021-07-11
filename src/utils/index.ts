import { validateToken, getUserProfile } from './auth'

export async function getClaims(req: any) {

    const { cookies: { accessToken, idToken } } = req

    const validAccessToken = await validateToken({ accessToken }, process.env.GOOGLE_CLIENT_ID || '')
    const validIdToken = await validateToken({ idToken }, process.env.GOOGLE_CLIENT_ID || '')
    const userProfile = await getUserProfile(accessToken);

    if (validAccessToken && validIdToken && userProfile) {

        return userProfile;
    }

    return null;
}

export const setCookies = (_response: any) => (tokens: any) => {
    const { credentials: { access_token, refresh_token, id_token } } = tokens

    _response.cookie('accessToken', access_token, { httpOnly: true });
    _response.cookie('refreshToken', refresh_token, { httpOnly: true });
    _response.cookie('idToken', id_token, { httpOnly: true });
}

