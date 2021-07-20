import { Arg, Ctx, Field, Mutation, ObjectType, PubSub, PubSubEngine, Query, Resolver, Root, Subscription, UseMiddleware } from "type-graphql";
import { CustomContext } from "../../context/types";
import { Filerequest } from "../../generated/type-graphql";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { FILE_REQUEST_ANSWER, FILE_REQUEST_QUERY } from "../SubscriptionTypes";

@ObjectType()
class FileRequestArgs {

    @Field()
    receiverId!: string

    @Field()
    name!: string

    @Field()
    size!: number
}

@ObjectType()
class FileResponseArgs {

    @Field()
    id!: string

    @Field()
    accepted!: boolean
}

@Resolver(Filerequest)
export class FileRequestResolver {

    @UseMiddleware(isAuthenticated)
    @Query(returns => [Filerequest])
    async getPendingFileRequests(
        @Ctx() ctx: CustomContext,
    ): Promise<Filerequest[]> {
        const { req: { claims: { id } }, prisma } = ctx

        return await prisma.filerequest.findMany({ where: { receiverid: id } })
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(returns => Filerequest)
    async requestFileAccept(
        @Arg("input") fileRequestArgs: FileRequestArgs,
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ): Promise<Filerequest> {
        const { req: { claims: { id } }, prisma } = ctx

        const { receiverId, name, size } = fileRequestArgs

        const fileRequest = await prisma.filerequest.create({
            data: {
                senderid: id,
                receiverid: receiverId,
                name,
                size
            }
        })

        pubSub.publish(FILE_REQUEST_QUERY, fileRequest)

        return fileRequest
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(returns => Filerequest)
    async responseFileAccept(
        @Arg("input") FileResponseArgs: FileResponseArgs,
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ): Promise<Filerequest> {
        const { prisma } = ctx

        const { id: requestId, accepted } = FileResponseArgs

        const fileRequest = await prisma.filerequest.update({
            where: {
                id: requestId
            },
            data: {
                accepted
            }
        })

        pubSub.publish(FILE_REQUEST_ANSWER, fileRequest)


        return fileRequest
    }

    @Subscription(() => Filerequest, {
        topics: FILE_REQUEST_QUERY,
        filter: ({ payload, args, context: { connection } }: { payload: Filerequest, args: any, context: any }) => {

            const { id } = connection.context.claims

            const { receiverid } = payload

            return receiverid === id
        },
    }
    )
    subscribeToFileRequest(
        @Root() filerequest: Filerequest,
    ): Filerequest {
        return filerequest
    }


    @Subscription(() => Filerequest, {
        topics: FILE_REQUEST_ANSWER,
        filter: ({ payload, args, context: { connection } }: { payload: Filerequest, args: any, context: any }) => {

            const { id } = connection.context.claims

            const { senderid } = payload

            return senderid === id
        },
    }
    )
    subscribeToFileResponse(
        @Root() fileResponse: Filerequest,
    ): Filerequest {
        return fileResponse
    }
}
