import { Field, ObjectType, ID, Float } from 'type-graphql';
import { User } from '../UserResolver/User';

@ObjectType()
export class UserPosition {

    @Field((type) => ID)
    id!: string

    @Field((type) => Date)
    updatedat!: Date

    @Field((type) => User)
    user!: User

    @Field((type) => Float)
    latitude!: Number

    @Field((type) => Float)
    longitude!: Number
}