import {
  Authorized, Field, ObjectType, Query, Resolver, 
} from 'type-graphql';

import { menu, menuPublic } from '../../helpers/panel';

@ObjectType()
export class MenuPublic {
  @Field()
    name: string;
  @Field()
    id: string;
}

@ObjectType()
export class MenuPrivate {
  @Field()
    name: string;
  @Field({ nullable: true })
    category?: string;
  @Field()
    id: string;
  @Field()
    enabled: boolean;
}

@Resolver()
export class MenuResolver {
  @Query(returns => [MenuPublic])
  menuPublic() {
    return menuPublic;
  }
  @Authorized()
  @Query(returns => [MenuPrivate])
  menuPrivate() {
    return menu.map((o) => ({
      category: o.category, name: o.name, id: o.id, enabled: o.this ? o.this.enabled : true,
    }));
  }
}