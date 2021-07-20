import { Field, ObjectType } from 'type-graphql';
import { UserPosition } from '../UserPositionResolver/UserPosition';

@ObjectType()
export class User {

    @Field()
    id!: string

    @Field()
    name!: string

    @Field()
    email!: string

    @Field()
    image!: string

    @Field()
    online!: boolean

    @Field((type) => UserPosition)
    userPosition!: UserPosition
}