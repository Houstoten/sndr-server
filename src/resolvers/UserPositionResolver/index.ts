import { Resolver, Query, Ctx, InputType, Field, Float, Arg, Mutation, PubSub, PubSubEngine, UseMiddleware } from 'type-graphql';

import { CustomContext } from '../../context/types';
import { isAuthenticated } from '../../middlewares/isAuthenticated';

import { UserPosition } from './UserPosition'

@InputType()
class PositionArgs {

    @Field((type) => Float)
    latitude!: number

    @Field((type) => Float)
    longitude!: number
}

@Resolver(UserPosition)
export class UserPositionResolver {
    
    @UseMiddleware(isAuthenticated)
    @Mutation(returns => UserPosition)
    async setCurrentPosition(
        @Arg("input") position: PositionArgs,
        @Ctx() ctx: CustomContext, 
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
