import {
  Embeddable,
  Embedded,
  Entity,
  MikroORM,
  PrimaryKey,
  Property,
} from "@mikro-orm/sqlite";

@Embeddable()
class Properties {
  @Property({ lazy: true })
  tag: string;

  constructor(tag: string) {
    this.tag = tag;
  }
}

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @Embedded(() => Properties)
  properties: Properties;

  constructor(name: string, email: string, properties: Properties) {
    this.name = name;
    this.email = email;
    this.properties = properties;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [User],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("basic CRUD example", async () => {
  orm.em.create(User, {
    name: "Foo",
    email: "foo",
    properties: new Properties('Bar'),
  });
  await orm.em.flush();
  orm.em.clear();

  const user1 = await orm.em.findOneOrFail(
    User,
    { email: "foo" },
    { fields: ['*', "properties.tag"] }
  );
  expect(user1.name).toBe("Foo");
  expect(user1.email).toBe("foo");
  expect(user1.properties.tag).toBe("Bar");
  
  orm.em.clear();

  const user2 = await orm.em.findOneOrFail(
    User,
    { email: "foo" },
    { populate: ["properties.tag"] }
  );
  expect(user2.name).toBe("Foo");
  expect(user2.email).toBe("foo");
  expect(user2.properties.tag).toBe("Bar");
});
