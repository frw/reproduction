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
  @Property()
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
    entities: [User, Properties],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("not updated on conflict with default settings", async () => {
  orm.em.create(User, {
    name: "Foo",
    email: "foo",
    properties: {
      tag: "foo",
    },
  });
  await orm.em.flush();
  orm.em.clear();

  await orm.em.upsert(User, {
    name: "Foo",
    email: "foo",
    properties: {
      tag: "foo2",
    },
  });
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, { email: "foo" });
  expect(user.properties.tag).toBe("foo2");
});

test("error when specifying embedded property in onConflictMergeFields", async () => {
  orm.em.create(User, {
    name: "Bar",
    email: "bar",
    properties: {
      tag: "bar",
    },
  });
  await orm.em.flush();
  orm.em.clear();

  await orm.em.upsert(
    User,
    {
      name: "Bar",
      email: "bar",
      properties: {
        tag: "bar2",
      },
    },
    {
      onConflictFields: ["email"],
      onConflictMergeFields: ["name", "properties"],
    }
  );
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, { email: "bar" });
  expect(user.properties.tag).toBe("bar2");
});

test("succeeds when specifying full embedded property path in onConflictMergeFields with explicit casting", async () => {
  orm.em.create(User, {
    name: "Baz",
    email: "baz",
    properties: {
      tag: "baz",
    },
  });
  await orm.em.flush();
  orm.em.clear();

  await orm.em.upsert(
    User,
    {
      name: "Baz",
      email: "baz",
      properties: {
        tag: "baz2",
      },
    },
    {
      onConflictFields: ["email"],
      onConflictMergeFields: ["name", "properties.tag" as keyof User],
    }
  );
  orm.em.clear();

  const user = await orm.em.findOneOrFail(User, { email: "baz" });
  expect(user.properties.tag).toBe("baz2");
});
