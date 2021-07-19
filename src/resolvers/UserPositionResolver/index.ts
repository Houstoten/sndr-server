import { Resolver, Query, Ctx, InputType, Field, Float, Arg, Mutation, PubSub, PubSubEngine } from 'type-graphql';

import { Context } from "vm";

import { UserPosition } from './UserPosition'

@InputType()
class PositionArgs {

    @Field((type) => Float)
    latitude!: Number

    @Field((type) => Float)
    longitude!: Number
}

@Resolver(UserPosition)
export class UserPositionResolver {
    @Mutation(returns => UserPosition)
    async setCurrentPosition(
        @Arg("input") position: PositionArgs,
        @Ctx() ctx: Context, 
        @PubSub() pubSub: PubSubEngine
    ): Promise<UserPosition> {
        const { req: { claims: { id } }, prisma } = ctx
        
        const userPositionResponse = prisma.userposition.upsert({
            where: {
                userid: id
            },
            update: {
               ...position
            },
            create: {
                user: {connect: {id}},
                ...position
            }
        })

        const payload = {userid: id, ...userPositionResponse}
        
        await pubSub.publish("LOCATIONUPDATE", payload);

        return userPositionResponse;
    }
}
