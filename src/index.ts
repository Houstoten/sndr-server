import "reflect-metadata";
import { GraphQLServer } from 'graphql-yoga'
import { Arg, buildSchema, Field, Mutation, Resolver, ObjectType, Query, InputType, Ctx } from 'type-graphql';
import { authenticateGoogle, validateToken, getUserProfile, refreshTokens } from './auth/authUtils'
import { Context } from "vm";
const jwt = require('jsonwebtoken');
import cookieParser from 'cookie-parser'
import { rule, shield } from "graphql-shield";

async function getClaims(req: any) {

    const { cookies: { accessToken, idToken, refreshToken } } = req

    const validAccessToken = await validateToken({ accessToken }, "629755736096-4nfiv64cnmk3jiuf85uvbj6fbhc79r2h.apps.googleusercontent.com")
    const validIdToken = await validateToken({ idToken }, "629755736096-4nfiv64cnmk3jiuf85uvbj6fbhc79r2h.apps.googleusercontent.com")
    const userProfile = await getUserProfile(accessToken);

    if (validAccessToken && validIdToken && userProfile) {

        return userProfile;
    }

    return null;
}

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
    console.log(ctx.request.claims);

    return ctx.request.claims !== null;
});

const permissions = shield({
    Query: {
        hello: isAuthenticated,
        getUserData: isAuthenticated
    }
});

const setCookies = (_response: any) => (tokens: any) => {            
    const { credentials: {access_token, refresh_token, id_token} } = tokens
    
    _response.cookie('accessToken', access_token, { httpOnly: true });
    _response.cookie('refreshToken', refresh_token, { httpOnly: true });
    _response.cookie('idToken', id_token, { httpOnly: true });
}

//login
//sign out
//refreshtoken
//getUserData
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
class AuthResolver {

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

        await refreshTokens({ accessToken, idToken, refreshToken }).then(setCookies(response)).catch(err => {throw err})
        
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
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    id_token: idToken
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

async function bootstrap() {

    const schema = await buildSchema({
        resolvers: [AuthResolver],
    });

    const server = new GraphQLServer({
        //@ts-ignore
        schema,
        context: async ({ request, res, ...rest }: any) => {
            return {
                request: { ...request, claims: await getClaims(request) },
                res,
                ...rest
            };
        },
        middlewares: [permissions],
    });

    server.express.use(cookieParser())

    // Start the server
    server.start(() => console.log("server start"))
}

bootstrap();
