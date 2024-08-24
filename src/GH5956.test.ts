import {
  Embeddable,
  Embedded,
  Entity,
  ManyToOne,
  MikroORM,
  PrimaryKey,
  Property,
} from "@mikro-orm/sqlite";

@Entity()
class Organization {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ lazy: true })
  tag: string;

  constructor(name: string, tag: string) {
    this.name = name;
    this.tag = tag;
  }
}

@Embeddable()
class Properties {
  @ManyToOne({ entity: () => Organization })
  organization: Organization;

  constructor(organization: Organization) {
    this.organization = organization;
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

  @Embedded()
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
    entities: [User, Properties, Organization],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("GH5956", async () => {
  const organization = orm.em.create(Organization, { name: "Bar", tag: "bar" });
  orm.em.create(User, { name: "Foo", email: "foo", properties: new Properties(organization) });
  await orm.em.flush();
  orm.em.clear();

  const user1 = await orm.em.findOneOrFail(
    User,
    { email: "foo" },
    { fields: ["*", "properties.organization.tag"] }
  );
  expect(user1.properties.organization.tag).toBe("bar");
  orm.em.clear();

  const user2 = await orm.em.findOneOrFail(
    User,
    { email: "foo" },
    { populate: ["properties.organization.tag"] }
  );
  expect(user2.properties.organization.tag).toBe("bar");
});
