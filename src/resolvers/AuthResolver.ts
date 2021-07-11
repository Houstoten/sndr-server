import { Arg, Field, Mutation, Resolver, ObjectType, Query, InputType, Ctx } from 'type-graphql';
import { authenticateGoogle, refreshTokens } from '../utils/auth'
import { Context } from "vm";

import { setCookies } from '../utils'

@ObjectType()
class UserAuth {

    constructor(name: string, email: string, image: string) {
        this.name = name
        this.email = email
        this.image = image
    }

    @Field()
    name!: string

    @Field()
    email!: string

    @Field()
    image!: string
}

@ObjectType()
class AuthResponse {

    constructor(success: boolean) {
        this.success = success
    }

    @Field()
    success!: boolean
}

@InputType()
class AuthArgs {

    @Field()
    code!: string
}

@Resolver(AuthResponse)
export class AuthResolver {

    @Query(returns => String)
    hello(@Ctx() ctx: Context): string {
        const { request } = ctx;

        return 'world'
    }

    @Query(returns => UserAuth)
    getUserData(@Ctx() ctx: Context) {
        const { request: { claims: { name, email, picture: image } } } = ctx

        return new UserAuth(name, email, image)
    }

    @Mutation(returns => AuthResponse)
    async refreshTokens(
        @Ctx() ctx: Context
    ): Promise<AuthResponse | Error> {
        const { request: { cookies: { accessToken, idToken, refreshToken } }, response } = ctx

        await refreshTokens({ accessToken, idToken, refreshToken }).then(setCookies(response)).catch(err => { throw err })

        return new AuthResponse(true)
    }

    @Mutation(returns => AuthResponse)
    async signOut(
        @Ctx() ctx: Context
    ): Promise<AuthResponse | Error> {
        const { response } = ctx

        response.clearCookie('accessToken')
        response.clearCookie('refreshToken')
        response.clearCookie('idToken')

        return new AuthResponse(true)
    }

    @Mutation(returns => AuthResponse)
    async authGoogle(
        @Arg("input") authArgs: AuthArgs,
        @Ctx() ctx: Context
    ): Promise<AuthResponse | Error> {

        const { request, response } = ctx

        const { code } = authArgs;
        request.body = {
            ...request.body,
            code,
        };

        try {
            // data contains the accessToken, refreshToken and profile from passport
            //@ts-ignore
            const { data, info } = await authenticateGoogle(request, response);

            // console.log(data);

            if (data) {
                const { accessToken, refreshToken, idToken } = data;

                setCookies(response)({
                    credentials: {
                        access_token: accessToken,
                        refresh_token: refreshToken,
                        id_token: idToken
                    }
                })

                return new AuthResponse(true)
            }

            if (info) {

                console.log(info);

                switch (info.code) {
                    case 'ETIMEDOUT':
                        return (new Error('Failed to reach Google: Try Again'));
                    default:
                        return (new Error('something went wrong'));
                }
            }
            return (Error('server error'));
        } catch (error) {
            return error;
        }
    }
}

