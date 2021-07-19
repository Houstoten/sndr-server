import { Arg, Field, Mutation, Resolver, ObjectType, Query, InputType, Ctx, PubSub, PubSubEngine } from 'type-graphql';
import { Context } from "vm";

import { setCookies } from '../../utils'
import { authenticateGoogle, refreshTokens } from '../../utils/auth'

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

        return 'world'
    }

    @Mutation(returns => AuthResponse)
    async refreshTokens(
        @Ctx() ctx: Context
    ): Promise<AuthResponse | Error> {
        const { req: { cookies: { accessToken, idToken, refreshToken } }, res } = ctx

        await refreshTokens({ accessToken, idToken, refreshToken }).then(setCookies(res)).catch(err => { throw err })

        return new AuthResponse(true)
    }

    @Mutation(returns => AuthResponse)
    async signOut(
        @Ctx() ctx: Context,
        @PubSub() pubSub: PubSubEngine
    ): Promise<AuthResponse | Error> {
        const { req: { claims: { id } }, res } = ctx

        await pubSub.publish("USERONLINE", { id, online: false });
        
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.clearCookie('idToken')

        return new AuthResponse(true)
    }

    @Mutation(returns => AuthResponse)
    async authGoogle(
        @Arg("input") authArgs: AuthArgs,
        @Ctx() ctx: Context
    ): Promise<AuthResponse | Error> {

        const { req, res } = ctx

        const { code } = authArgs;
        req.body = {
            ...req.body,
            code,
        };

        try {
            // data contains the accessToken, refreshToken and profile from passport
            //@ts-ignore
            const { data, info } = await authenticateGoogle(req, res);

            // console.log(data);

            if (data) {
                const { accessToken, refreshToken, idToken } = data;

                setCookies(res)({
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
