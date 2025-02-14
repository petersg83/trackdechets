import { resetDatabase } from "../../../../../integration-tests/helper";
import { ErrorCode } from "../../../../common/errors";
import {
  userWithCompanyFactory,
  companyFactory
} from "../../../../__tests__/factories";
import makeClient from "../../../../__tests__/testClient";
import { Mutation } from "../../../../generated/graphql/types";
import { gql } from "graphql-tag";
import { webhookSettingFactory } from "../../../__tests__/factories";
import {
  getWebhookSettings,
  clearWebhookSetting
} from "../../../../common/redis/webhooksettings";
import { aesDecrypt } from "../../../../utils";

const CREATE_WEBHOOK_SETTING = gql`
  mutation CreateWebhookSetting($input: WebhookSettingCreateInput!) {
    createWebhookSetting(input: $input) {
      id
      createdAt
      endpointUri
      orgId
      activated
    }
  }
`;

describe("Mutation.createWebhookSetting", () => {
  afterEach(async () => {
    await resetDatabase();
    await clearWebhookSetting();
  });

  it("should disallow unauthenticated user", async () => {
    const company = await companyFactory();

    const { mutate } = makeClient();

    const { errors } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: "https://mycompany.com/webhook",
            token: "secret_secret_secret",
            activated: true
          }
        }
      }
    );

    expect(errors).toEqual([
      expect.objectContaining({
        message: "Vous n'êtes pas connecté.",
        extensions: expect.objectContaining({
          code: ErrorCode.UNAUTHENTICATED
        })
      })
    ]);
  });

  it("should create a webhook setting", async () => {
    const { user, company } = await userWithCompanyFactory("ADMIN");

    const { mutate } = makeClient(user);

    const { data } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: `https://mycompany.com/webhook/${company.orgId}`,
            token: "secret_secret_secret",
            activated: true
          }
        }
      }
    );

    expect(data.createWebhookSetting.orgId).toEqual(company.orgId);
    expect(data.createWebhookSetting.endpointUri).toEqual(
      `https://mycompany.com/webhook/${company.orgId}`
    );
    expect(data.createWebhookSetting.activated).toBe(true);

    // check webhook is cached in redis
    const redisWebhookSettings = await getWebhookSettings(company.orgId);

    expect(redisWebhookSettings.length).toEqual(1);
    expect(redisWebhookSettings[0].endpointUri).toEqual(
      `https://mycompany.com/webhook/${company.orgId}`
    );
    expect(aesDecrypt(redisWebhookSettings[0].token)).toEqual(
      "secret_secret_secret"
    );
  });
  it("should forbid short tokens", async () => {
    const { user, company } = await userWithCompanyFactory("ADMIN");

    const { mutate } = makeClient(user);

    const { errors } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: "https://mycompany.com/webhook",
            token: "short",
            activated: true
          }
        }
      }
    );

    expect(errors).toEqual([
      expect.objectContaining({
        message: "token must be at least 20 characters",
        extensions: expect.objectContaining({
          code: ErrorCode.BAD_USER_INPUT
        })
      })
    ]);
  });
  it("should forbid non htpps uri", async () => {
    const { user, company } = await userWithCompanyFactory("ADMIN");

    const { mutate } = makeClient(user);

    const { errors } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: "http://no-https.com/webhook",
            token: "secret_secret_secret",
            activated: true
          }
        }
      }
    );

    expect(errors).toEqual([
      expect.objectContaining({
        message: "L'url doit être en https",
        extensions: expect.objectContaining({
          code: ErrorCode.BAD_USER_INPUT
        })
      })
    ]);
  });
  it("should forbid to create a webhook setting for MEMBERS", async () => {
    const { user, company } = await userWithCompanyFactory("MEMBER");

    const { mutate } = makeClient(user);

    const { errors } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: "https://mycompany.com/webhook",
            token: "secret_secret_secret",
            activated: true
          }
        }
      }
    );
    expect(errors).toEqual([
      expect.objectContaining({
        message:
          "Vous n'avez pas la permission de gérer les webhooks de cet établissement.",
        extensions: expect.objectContaining({
          code: ErrorCode.BAD_USER_INPUT
        })
      })
    ]);
  });

  it("should forbid to create a webhook setting for a company not belonging to current user", async () => {
    const company = await companyFactory();
    const { user } = await userWithCompanyFactory("ADMIN");

    const { mutate } = makeClient(user);

    const { errors } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: "https://mycompany.com/webhook",
            token: "secret_secret_secret",
            activated: true
          }
        }
      }
    );

    expect(errors).toEqual([
      expect.objectContaining({
        message:
          "Vous n'avez pas la permission de gérer les webhooks de cet établissement.",
        extensions: expect.objectContaining({
          code: ErrorCode.BAD_USER_INPUT
        })
      })
    ]);
  });

  it("should forbid to create several webhook settings for the same company", async () => {
    const { user, company } = await userWithCompanyFactory("ADMIN");

    await webhookSettingFactory({
      company,
      token: "secret",
      endpointUri: "https://lorem.ipsum"
    });

    const { mutate } = makeClient(user);

    const { errors } = await mutate<Pick<Mutation, "createWebhookSetting">>(
      CREATE_WEBHOOK_SETTING,
      {
        variables: {
          input: {
            companyId: company.id,
            endpointUri: "https://mycompany.com/webhook",
            token: "secret_secret_secret",
            activated: true
          }
        }
      }
    );

    expect(errors).toEqual([
      expect.objectContaining({
        message: "Un webhook est déjà programmé pour cet établissement.",
        extensions: expect.objectContaining({
          code: ErrorCode.BAD_USER_INPUT
        })
      })
    ]);
  });
});
