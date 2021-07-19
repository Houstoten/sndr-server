import { Resolver, Query, Ctx, Field, ObjectType, Float, Subscription, Publisher, PubSub, Root, PubSubEngine } from 'type-graphql';

import * as R from 'rambda'

import { Context } from "vm";
import { UserPosition } from '../UserPositionResolver/UserPosition';

import { User } from './User'

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
    @Query(returns => User)
    getUserData(@Ctx() ctx: Context) {
        const { req: { claims: { id, name, email, picture: image } }, prisma } = ctx

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

    @Query(returns => [UserResponse])
    async getNearestUsers(@Ctx() ctx: Context): Promise<[UserResponse]> {
        const { req: { claims: { id } }, prisma } = ctx

        const { latitude, longitude }: UserPosition = await prisma.userposition.findUnique({
            where: {
                userid: id
            }
        })

        return prisma.$queryRaw`SELECT u.name, u.email, u.image, u.id, SQRT(POWER(ABS(up.latitude - ${latitude}), 2) + POWER(ABS(up.longitude - ${longitude}), 2)) as distance FROM "userposition" up join "user" u on up.userid=u.id and up.userid!=${id} and u.online=true order by distance;`
    }

    @Subscription(() => UserUpdateResponse, {
        topics: "LOCATIONUPDATE",
        // filter: ({ payload, args }: any) => {

        //     const { observableUsers } = args
        //     const { userId } = payload

        //     return R.find(R.equals(userId), observableUsers)
        // },
    }
    )
    async updateNearestData(
        @Ctx() ctx: Context,
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
        // filter: ({ payload, args }: any) => {

        //     const { observableUsers } = args
        //     const { userId } = payload

        //     return R.find(R.equals(userId), observableUsers)
        // },
    }
    )
    async updateUserOnline(
        @Root() userOnlineRequest: UserOnlineRequest,
        @Ctx() ctx: Context,
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
            return {...user, online: false}
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