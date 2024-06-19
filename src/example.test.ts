import {
  Entity,
  MikroORM,
  PrimaryKey,
  Property,
  Embeddable,
  Embedded,
  PostgreSqlDriver,
} from "@mikro-orm/postgresql";

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @Embedded({ entity: () => Role, array: true, nullable: true })
  roles?: Role[] | null;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}

@Embeddable()
class Role {
  @Property()
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    driver: PostgreSqlDriver,
    host: "localhost",
    dbName: "test",
    user: "postgres",
    password: "postgres",
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
  const user1 = orm.em.create(User, {
    name: "Foo",
    email: "foo",
    roles: [{ name: "Foo" }],
  });
  const user2 = orm.em.create(User, {
    name: "Bar",
    email: "bar",
    roles: [{ name: "Bar" }],
  });
  await orm.em.flush();

  user1.name = "Baz";
  user1.roles = null;

  user2.name = "Qux";
  user2.roles = null;

  await orm.em.flush();
  orm.em.clear();

  const user1Check = await orm.em.findOneOrFail(User, { email: "foo" });
  expect(user1Check.name).toBe("Baz");

  const user2Check = await orm.em.findOneOrFail(User, { email: "bar" });
  expect(user2Check.name).toBe("Qux");
});
