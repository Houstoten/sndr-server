import { Resolver, Query, Ctx, Field, ObjectType, Float, Subscription, Root, PubSubEngine, UseMiddleware, PubSub } from 'type-graphql';

import * as R from 'rambda'

import { User } from './User'
import { CustomContext } from '../../context/types';
import { isAuthenticated } from '../../middlewares/isAuthenticated';

@ObjectType()
class UserResponse extends User {

    @Field()
    id!: string

    @Field((type) => Float, { nullable: true })
    distance?: Number
}

@ObjectType()
class UserUpdateResponse {

    @Field()
    id!: string

    @Field((type) => Float, { nullable: true })
    distance!: Number
}

@ObjectType()
class UserOnlineRequest {
    @Field()
    id!: string

    @Field()
    online!: boolean
}

@ObjectType()
class UserOnlineResponse extends UserResponse {

    @Field()
    online!: boolean
}

@Resolver(User)
export class UserResolver {
    @UseMiddleware(isAuthenticated)
    @Query(returns => User)
    async getUserData(
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ) {

        const { req: { claims: { id, name, email, picture: image } }, prisma } = ctx

        await pubSub.publish("USERONLINE", { id, online: true });

        return prisma.user.upsert({
            where: {
                id
            },
            update: {
                id, name, email, image
            },
            create: {
                id, name, email, image
            }
        })
    }

    @UseMiddleware(isAuthenticated)
    @Query(returns => [UserResponse])
    async getNearestUsers(@Ctx() ctx: CustomContext): Promise<[UserResponse]> {
        const { req: { claims: { id } }, prisma } = ctx

        const { latitude, longitude } = await prisma.userposition.findUnique({
            where: {
                userid: id
            }
        }) ?? {}

        return prisma.$queryRaw`SELECT u.name, u.email, u.image, u.id, SQRT(POWER(ABS(up.latitude - ${latitude}), 2) + POWER(ABS(up.longitude - ${longitude}), 2)) as distance FROM "userposition" up join "user" u on up.userid=u.id and up.userid!=${id} and u.online=true order by distance;`
    }

    @Subscription(() => UserUpdateResponse, {
        topics: "LOCATIONUPDATE",
        filter: ({ payload, args, context: {connection} }: any) => {

            const { id: userid } = connection.context.claims

            const { id } = payload

            return userid !== id
        },
    }
    )
    async updateNearestData(
        @Ctx() ctx: CustomContext,
        @Root() newUserLocation: any,
    ): Promise<UserUpdateResponse> {
        const id = R.pathOr(null, ['connection', 'context', 'claims', 'id'], ctx)
        const prisma: any = R.path(['connection', 'context', 'prisma'], ctx)

        const { latitude: _latitude, longitude: _longitude, userid } = newUserLocation

        const { latitude, longitude }: any = await prisma.userposition.findUnique({
            where: {
                userid: id
            }
        })

        const distance = Math.sqrt(Math.pow(Math.abs(latitude - _latitude), 2) + Math.pow(Math.abs(longitude - _longitude), 2))

        return { id: userid, distance };
    }

    @Subscription(() => UserOnlineResponse, {
        topics: "USERONLINE",
        filter: ({ payload, args, context: {connection} }: any) => {

            const { id: userid } = connection.context.claims

            const { id } = payload

            return userid !== id
        },
    }
    )
    async updateUserOnline(
        @Root() userOnlineRequest: UserOnlineRequest,
        @Ctx() ctx: CustomContext,
    ): Promise<UserOnlineResponse> {

        const id = R.pathOr(null, ['connection', 'context', 'claims', 'id'], ctx)

        const prisma: any = R.path(['connection', 'context', 'prisma'], ctx)

        const user = await prisma.user.update({
            where: {
                id: userOnlineRequest.id
            },
            data: {
                online: userOnlineRequest.online
            }
        })

        if (!userOnlineRequest.online) {
            return { ...user, online: false }
        }

        const { latitude, longitude }: any = await prisma.userposition.findUnique({
            where: {
                userid: id
            }
        })

        const { latitude: _latitude, longitude: _longitude }: any = await prisma.userposition.findUnique({
            where: {
                userid: userOnlineRequest.id
            }
        })

        const distance = Math.sqrt(Math.pow(Math.abs(latitude - _latitude), 2) + Math.pow(Math.abs(longitude - _longitude), 2))

        return { ...user, online: true, distance }

    }

}