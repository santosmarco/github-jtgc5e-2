import { inspect } from "node:util";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({
  path: "../.env.local",
});

import { env } from "~/env";
import { __dangerouslyCreateAdminClient__ as createClient } from "~/lib/supabase/admin";
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { dedent } from "ts-dedent";
import { z } from "zod";
import type { TablesInsert } from "~/lib/supabase/database.types";
import _ from "lodash";

const momentIds = [
  "1fa34ad5-aa06-450b-8624-631c97ee4018",
  "002d0e77-5d28-44fa-ae68-11be18782ff2",
  "179e4173-e753-46a4-b287-110b7baed619",
  "14c1012e-90e8-4284-a08a-0a4ddb54f9d0",
  "1d7dfc7a-9538-40e8-b881-97a29e56332f",
  "0622311f-247c-43f6-8c94-8602d6451371",
  "0d79a989-5b47-460d-99e3-fd01b0cfcf74",
  "0092195d-49bf-436b-bfff-4bf53707e6e0",
  "04ff73bc-90ca-4e8c-90ee-1dae88269619",
  "186b9a52-b464-49d1-bdbc-f0e7547f4be4",
  "1afb706c-262c-41e1-ba70-f3d8134ee5c1",
  "1437bcd4-56cf-45db-8e32-b0fb519c7432",
  "04f74dea-85b5-437a-b6fc-d53b00c2f6a5",
  "16f60992-d858-4100-b310-c65dd28d4ff2",
  "1fe505c5-455b-4b35-8c56-e45993cec803",
  "0617117e-3830-4ec2-a77f-6cfe8b4cd8d7",
  "0db0c1a1-2b64-4d23-9774-c3912499d830",
  "0ac5ba7b-370b-41c1-9738-af7d431ba34b",
  "0c3bfb73-3209-4f13-a2a3-524e8f697c95",
  "18e37325-6d97-44a8-996f-7fe1c701fbef",
  "05e20bb3-53cd-4229-a7ed-18c5a2148ae3",
  "0baa9a02-b901-438f-bdbe-922548482aa1",
  "0b6b72c2-7423-4fab-9dd6-b1c6e606598e",
  "0c55035d-6cb9-469d-8bdd-5e8cd2ecf57f",
  // "84265c53-9171-4dee-ad32-1d19a87aea9d",
  // "19edab60-11b6-4b38-bef8-fb0e6c3fe70c",
  // "c52ebda5-d29c-42ea-8be6-5614ca39f29b",
  // "406ac4c4-102d-4438-b6d5-0a28ef448cff",
  // "402097ac-0fcd-4a00-b792-cab467da4eb7",
  // "cd024d44-3bab-4414-8cec-6c5295216dd6",
  // "4b269388-bcb2-427d-a312-915be382f49c",
  // "1b5365d0-992c-4481-9338-943044fb12c2",
  // "02917307-1f8c-498a-9ca8-c283350c8217",
  // "26ba0929-5879-4397-ba85-2c141a393106",
  // "a12ed3d0-6517-437d-9f95-fe1d61e495b3",
  // "123285ea-a73b-47c1-8e31-a385c98f3099",
  // "f2aad39f-e37b-470d-9d2d-8ee038ee0983",
  // "df469b9f-1d25-49c4-b33a-deee97654efe",
  // "fc3c664e-e7ce-4d30-ac27-93a77dffbf84",
  // "9bf6e227-d618-4306-98bb-4b81e1bda91e",
  // "798af911-eb1e-493a-82a5-38cf2fcfcbad",
  // "c6b17b3f-0bda-479f-8254-c8d975195560",
  // "469f8d5a-f1a1-4e83-9987-8744fb68af65",
  // "893dd92b-1cc5-4cb8-b48f-dae309f5c8d1",
  // "d09c70d9-6c63-431a-a562-95248373cf72",
  // "31711ea6-ccf1-4269-8454-52d64edc2743",
  // "668ee65c-96e7-4843-ada3-df72633b8404",
  // "83adaa87-876c-421b-899a-f78cefd71002",
  // "220a991b-1a45-444a-9954-6e5a61f7f6af",
  // "ec253ecb-24b5-46ff-9d56-d72f6b29e1bd",
  // "6f3b828c-96c7-4663-9d61-e3eb154bb1a2",
  // "7f7a5789-840c-44ed-b9ca-da75b3369892",
  // "3e98c54d-1e15-43b0-baa8-eed134b7c917",
  // "edb700f2-4ec8-42c0-97ac-3de979272389",
  // "21aaea7e-8f05-44c6-8d4e-3b426d336eab",
  // "5ebb50d6-5143-4cd1-bafb-d8fc3dd1bfb7",
  // "e184db80-9321-435a-af6b-1920296b7f8c",
  // "88031dcc-5707-4ed0-9f5f-59367c129252",
  // "b45ec556-ff53-444d-80cf-648a85285b6a",
  // "857ab889-5786-4b36-a358-3423a7c0e7db",
  // "4c81ec5f-2c32-4fd7-890b-f6b1058efaba",
  // "f955520e-7112-4dbd-bac7-0ff136dd03da",
  // "d3a910ea-1fd8-415f-a7a2-84a9f21a52ed",
  // "fe461914-0dda-47af-b0e3-f7e49563f285",
  // "e4a52887-b064-4fd8-84e1-c5e2a0fb567a",
  // "d0e303d0-b485-42f1-bce3-b0a32daec808",
  // "736300c6-ea9e-4e32-b3e9-47828d1d3344",
  // "c52b1630-04e8-404d-ba27-42321d281f73",
  // "17bdd893-8e00-4c99-9bf4-4af06bfa1a96",
  // "55afc9d1-770c-4f0a-82f2-77eb2d985ff8",
  // "9321196b-5abc-4b40-9fdc-ad25b29444fd",
  // "9342af73-c7cb-43e4-acde-37fd20400913",
  // "8b954160-2565-40c3-a659-c77b6b4e0e58",
  // "8b10d468-6305-4bdf-80af-df114206e6bc",
  // "3581120f-c615-4594-81da-08648bc9640b",
  // "3db71859-0994-41c9-ab32-12c38a5ed834",
  // "7e8faf95-e7b9-48ff-b68e-2c82d6c441cf",
  // "82b90313-13ae-432b-bfe8-f962dff4c15c",
  // "76482dae-d242-47f9-af9d-b9a921932a59",
  // "1f46ea54-a244-4f48-afe1-650c449ae015",
  // "bad63494-b712-42d3-ab95-2680c9dbc210",
  // "d6aa6f9e-0d1b-4ad5-8496-6f2afbadac74",
  // "bd0df65f-0c57-4f41-91e9-b0dcc7d75671",
  // "d116ec1e-6e7b-47cc-b2e6-e1008348b641",
  // "f71a95f6-91b4-42c0-9662-44c342b4cbcb",
  // "4a64fb8e-81cc-4db6-8d3a-371d9d16705b",
  // "d13a24c3-6e48-4f4d-b8a0-23d155f49271",
  // "7ceb1be2-64d3-43f1-8121-7fb546e1d1b7",
  // "764a1389-96d6-4304-9270-cc8c6613fefd",
  // "caf30de2-4eb0-4f72-94a2-ba2d861d936f",
  // "8a2b7dcc-53e1-48f6-922f-a1c56ddeb2f0",
  // "fc8821a9-b97c-4af5-9cdb-97d9be2ae26a",
  // "2eccd53a-b682-4bcc-bee2-632a0af2eb1a",
  // "dfb672e7-5b5a-432c-9dea-eddb9c712e17",
  // "df82c531-681e-47b4-a3cb-14f5fb8e7b49",
  // "5ac9512f-7935-4974-b854-d7fcd02bc30a",
  // "407c3c77-9b0e-4fc2-a5b9-c290c3f506d4",
  // "30015f1a-cf02-4bcc-8f25-b98a17896b60",
  // "5aa0c5cc-4571-4828-b8b4-2cae53788ccb",
  // "42a3540e-851b-445f-99ec-be9037152256",
  // "86706ef1-2c8d-4410-963c-1bed8b1f6014",
  // "38033192-991b-48b9-a117-e9e54d922c21",
  // "1a801d1f-64fc-49e1-9d92-d950c23a7a00",
  // "b348866f-c4d1-406f-b734-8a302a43f013",
  // "b0fefc57-0ea7-43a1-b634-ac97523c6b08",
  // "ae00429b-7922-4ff6-917f-9ff6dd17c300",
  // "7d227008-9458-4645-a02c-c9f1260cf778",
  // "4141c665-0192-49da-a63d-68d78547a387",
  // "1a368eed-a6e1-46ce-b1f9-dae146600f91",
  // "ca6ea2c8-b6cf-4435-a1a4-33d200ba5ee9",
  // "612cf4cf-e43e-4054-942c-d6e07cf20740",
  // "82f96026-6837-4ab9-af6f-4a99961b9621",
  // "7ba4cee5-1808-4f40-882c-c9c17db499c6",
  // "a8a3512b-d276-4a5b-988d-6da9b28d7c29",
  // "9efc57b4-e3c9-4834-b74c-aace0387dd78",
  // "b3b5cfab-66dc-4651-9474-87ff5f15cbb2",
  // "78964e73-cdee-45aa-93cd-d0b77c1786ef",
  // "015c2d04-f8b7-4f5a-8981-9c5aa078fe9f",
  // "7e768885-e3a9-4c45-85a3-c62fe16b9b8d",
  // "1a56b4e9-392f-409c-9f5c-10855ae30516",
  // "a237d521-9905-4cb0-acb1-c3f907929ffe",
  // "5dfa792a-fb29-46b6-8e0c-1979c614f482",
  // "f53e260a-50d4-4557-a161-a23dbcce3aa2",
  // "ecfff2e3-62f4-4d67-aeac-637fdbf79913",
  // "2464da77-975a-4ba5-a821-7a9100e144dd",
  // "e9a42963-10ce-49d9-866d-ad133fb39262",
  // "de88598f-8d86-4a84-8bd4-162217a5c6c9",
  // "53616e08-44be-4fc2-a214-99f4c542c818",
  // "20ec5642-91dd-4e96-b7d7-e944ec1af738",
  // "2c9cccda-f0fb-4d2a-b0ab-3c9158ff03b1",
  // "c9262bb9-b4d4-47db-9959-f7cf1e213092",
  // "bc04aced-834b-42ca-894c-a26a72b5d241",
  // "5cfbf9fe-1c8c-4fee-b6a2-f5bfff83741e",
  // "8fbb8442-9755-435b-aef8-771c6f12e303",
  // "50a641d5-06ed-49a7-9306-2f8eda07af13",
  // "ce9bdb8c-8c42-4870-9da9-3e5b4d35a938",
  // "678c9cec-ac56-4e4e-b4c9-5e082ea8b8c5",
  // "c72fda90-b9db-413a-aa9a-371e1345f1de",
  // "049ce2be-555a-400e-a681-17cd9acba456",
  // "e4213fd4-59c3-49ae-9ada-c6fed616920b",
  // "c52b4754-862b-42e1-8f2e-dfc16be8d01d",
  // "a154764a-00c5-468b-8bce-b57fe50f2329",
  // "b093972c-231c-4c45-904b-5e918440eaa4",
  // "44ade881-d7b2-466d-9dde-ce3484cc88eb",
  // "6f8dc063-9124-4922-bb59-1f9f3703db93",
  // "e60c7058-79af-47f5-92e0-3ffc01d74309",
  // "119a1828-3c53-4a0e-84f3-539791513344",
  // "6e4604e3-56f8-437a-ab62-4d1391f35e24",
  // "eec0c93b-6a24-4548-9551-ef96d39399f0",
  // "ae08c175-92a9-4ae7-8249-16ed9f4e362a",
  // "4f91b371-e737-4d99-a302-113b80a88cb2",
  // "9e9b5c14-d5c3-42fa-838e-37d7056d79a6",
  // "3efd4906-adc0-407b-9b40-0108dcbd3ebf",
  // "308630ec-e7c5-4510-b739-e57dd59fe6ae",
  // "396dff16-6b88-4281-a6c7-e23e07f1783a",
  // "8e98626a-195e-449a-8832-546bca8233c7",
  // "1409dde8-3c9c-4542-8672-9d375b7bf80f",
  // "9f2605c6-4910-4980-ab64-73ad34a135f1",
  // "4ba8adb2-b20e-49be-81c4-bd347b825503",
  // "6a1e72fb-329c-49e1-8a97-d399f15b3c73",
  // "40a796cc-3f82-4350-8d3b-d4f9d9d53dbe",
  // "bedafd40-1f14-43d8-9345-3411f12430c6",
  // "aa2c7e60-4ad9-46b5-ab9e-a47ae8d86133",
  // "5649e6d1-f7f5-4653-be12-eb8bb0114aa0",
  // "166975fc-180f-473f-b8c9-699559c65f47",
  // "bdff6390-c364-4ef0-9cc4-c84d4bed05ba",
  // "aa3f4558-307d-4793-b995-d46a8a397816",
  // "fb69573f-cf54-4be8-b4aa-35735290a759",
  // "b35b50d3-19b2-4c52-b14a-a5fe6f59d044",
  // "8d924b80-cf82-41ce-b01a-5ab6adc8a1d8",
  // "7a47cefb-ba3c-4aeb-9bde-6c35aa975223",
  // "69a644c9-55b8-4082-8335-1abbd2fcd0ce",
  // "78d5a806-707a-45f0-be1b-943d9190b504",
  // "aad594b3-39be-41cf-af9f-5a447c294294",
  // "ee285f89-79ba-4e80-a270-7250e5db6fe4",
  // "58c3b3fb-ee9e-4cd3-8dc3-a6f507600642",
  // "98634ecf-b8cd-4a55-acb6-a09b591ea6b0",
];

const videoApiIds = [
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1Bryty1jSLaylxReNiT46O",
  "vi1UvDw9yfSGvXVIVjc5sYhE",
  "vi1UvDw9yfSGvXVIVjc5sYhE",
  "vi1UvDw9yfSGvXVIVjc5sYhE",
  "vi1UvDw9yfSGvXVIVjc5sYhE",
  "vi1UvDw9yfSGvXVIVjc5sYhE",
  "vi1UvDw9yfSGvXVIVjc5sYhE",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi1ZmvM3CrfLyX8RbKRNxqIV",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "vi3YbPJiEIriVIBCL81iJPoD",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "virIBhXDMwJ6wS89AmKEZRV",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1BKK2UqjEEMl9O5SSlNkAg",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi1WhFHzfznmmu4cnTXQcLvY",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3vVOUiu3L0A4k432qNvyZT",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi3Xt2uBaalFG1eYfrVQ0Smt",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
  "vi7YkOSlmfVgYs2z1s6CfGnK",
];

const Schema = z
  .object({
    analysis: z
      .object({
        accuracy: z
          .object({
            categorical_accuracy: z
              .string()
              .describe(
                "Detailed reasoning about how well the moment aligns with its described category or type of activity",
              ),
            relational_accuracy: z
              .string()
              .describe(
                "Evaluation of whether the entities and their relationships are correctly portrayed in the moment",
              ),
          })
          .describe(
            "Assessment of the moment's accuracy in terms of category and relationships",
          ),
        interestingness: z
          .object({
            stakes: z
              .string()
              .describe(
                "Analysis of whether the topic involves significant or non-trivial matters with meaningful consequences",
              ),
            emotional_amplitude: z
              .string()
              .describe(
                "Evaluation of emotional expression through facial expressions, voice intonation, or word choice in the interaction",
              ),
            user_spotlight: z
              .string()
              .describe(
                "Assessment of whether the user has a prominent role and speaks for a significant amount of time in the moment",
              ),
          })
          .describe(
            "Evaluation of the moment's engagement factors including stakes, emotional depth, and user prominence",
          ),
        score_justification: z
          .string()
          .describe(
            "Concise explanation connecting the analysis to the final numerical score, highlighting key factors that influenced the rating",
          ),
      })
      .describe(
        "Comprehensive analysis of the moment's accuracy and interestingness based on the specified criteria",
      ),
    score: z
      .number()
      .describe(
        "Numerical assessment between 0 and 10 reflecting both accuracy and interestingness of the moment",
      ),
  })
  .describe(
    "Complete evaluation of the moment including detailed analysis and final numerical score",
  );

const prompt = (
  moment: TablesInsert<"moments"> & {
    vtt: string;
  },
) => dedent`
You will be presented with a moment from a VTT transcript. Your task is to analyze this moment and assign a score between 0 and 10 based on specific criteria. Here is the transcript:

<moment>
Title: ${moment.title}
Summary: ${moment.summary}
Type: ${moment.activity}
</moment>

<transcript>
${moment.vtt}
</transcript>

Analyze the moment based on the following criteria:

- **Accuracy:**
  - **Categorical Accuracy:** Determine how obviously the moment matches the described category.
  - **Relational Accuracy:** Evaluate if the entities and their relationships are correct.

- **Interestingness:**
  - **High Stakes:** Assess if the topic revolves around a non-trivial matter.
  - **High Emotional Amplitude:** Evaluate if there is notable emotional expression through facial expressions, voice intonation, or word choice.
  - **Spotlight on the User:** Determine if the moment starts with the user speaking for a significant amount of time.

Consider the following questions for your analysis:
- Is the moment clearly about the intended topic (e.g., feedback, delegation)?
- Are the correct people involved in the correct roles?
- Is the subject matter significant rather than trivial?
- Is there emotional depth or intensity in the interaction?
- Does the user have a prominent role in the moment?

# Steps

1. **Review the Transcript:** Analyze the provided transcript carefully.
2. **Assess Accuracy:**
  - Reason about categorical accuracy and provide insight into whether the moment aligns with the described category.
  - Evaluate relational accuracy by reasoning if the entities and their roles are correctly portrayed.
3. **Assess Interestingness:**
  - Determine if the stakes are high and provide reasoning.
  - Assess emotional amplitude by discussing any notable emotional cues in the dialogue or expressions.
  - Evaluate whether the user plays a prominent role in the moment, providing supporting reasoning.
4. **Assign a Score:** Based on your reasoning, assign a numerical score between 0 and 10.
5. **Justify the Score:** Provide a concise justification for the score you assigned.

# Output Format

Provide your analysis and score in the following JSON structure:

\`\`\`json
{
  "analysis": {
    "accuracy": {
      "categorical_accuracy": "[Your reasoning about categorical accuracy]",
      "relational_accuracy": "[Your reasoning about relational accuracy]"
    },
    "interestingness": {
      "stakes": "[Your reasoning about stakes]",
      "emotional_amplitude": "[Your reasoning about emotional amplitude]",
      "user_spotlight": "[Your reasoning about user spotlight]"
    },
    "score_justification": "[A brief explanation of why you chose the final score]"
  },
  "score": "[Your numerical score between 0 and 10]"
}
\`\`\`

# Notes

- Ensure all reasoning is clearly articulated before concluding with the score.
- The final score should comprehensively reflect your analysis of both accuracy and interestingness.
`;

const formatDataForCsv = (
  momentData: (TablesInsert<"moments"> & {
    vtt: string;
    result: z.infer<typeof Schema>;
  })[],
) => {
  // Create CSV header
  const header = [
    "Moment ID",
    "Report ID",
    "Moment Title",
    "Moment Summary",
    "Activity",
    "Score",
    "Accuracy Assessment",
    "Accuracy Explanation",
    "Interestingness Assessment",
    "Interestingness Explanation",
    "Overall Analysis",
  ].join(",");

  // Format each row
  const rows = momentData.map((item) => {
    const evaluation = item.result || {
      analysis: {
        accuracy: { assessment: "", explanation: "" },
        interestingness: { assessment: "", explanation: "" },
        overall: "",
      },
      score: 0,
    };

    // Escape CSV values to handle commas and quotes
    const escapeCsv = (value: string) => {
      if (!value) return "";
      const needsQuotes =
        value.includes(",") || value.includes('"') || value.includes("\n");
      if (!needsQuotes) return value;
      return `"${value.replace(/"/g, '""')}"`;
    };

    return [
      item.id,
      item.video_api_id,
      escapeCsv(item.title || ""),
      escapeCsv(item.summary || ""),
      escapeCsv(item.activity || ""),
      evaluation.score,
      escapeCsv(evaluation.analysis.accuracy.categorical_accuracy),
      escapeCsv(evaluation.analysis.accuracy.relational_accuracy),
      escapeCsv(evaluation.analysis.interestingness.stakes),
      escapeCsv(evaluation.analysis.interestingness.emotional_amplitude),
      escapeCsv(evaluation.analysis.interestingness.user_spotlight),
      escapeCsv(evaluation.analysis.score_justification),
    ].join(",");
  });

  return [header, ...rows].join("\n");
};

const saveToCsv = (
  data: (TablesInsert<"moments"> & {
    vtt: string;
    result: z.infer<typeof Schema>;
  })[],
) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `moment-evaluations-${timestamp}.csv`;
  const csvContent = formatDataForCsv(data);

  try {
    writeFileSync(join(process.cwd(), filename), csvContent);
    console.log(`CSV file saved successfully: ${filename}`);
    return filename;
  } catch (error) {
    console.error("Error saving CSV file:", error);
    throw error;
  }
};

const main = async () => {
  const supabase = await createClient();
  const result: Parameters<typeof saveToCsv>[0] = [];
  const batchSize = 25;

  const { data: moments, error } = await supabase
    .from("moments")
    .select("*, meeting:meetings(*)")
    .in("id", momentIds);

  if (error) {
    console.error(error);
  }

  // Process moments in batches of 25 for parallel execution
  for (let i = 0; i < (moments?.length ?? 0); i += batchSize) {
    const batch = (moments ?? []).slice(i, i + batchSize);
    console.log(
      `Processing batch ${i / batchSize + 1} (${batch.length} moments)`,
    );

    const batchPromises = batch.map(async (moment) => {
      if (!moment?.meeting) {
        console.log(`Moment ${moment.id} not found`);
        return null;
      }

      const vtt = getMomentVtt(
        moment.meeting.clean_vtt_file ?? "",
        moment.segment_id_sequence_start ?? 0,
        moment.segment_id_sequence_end ?? 0,
      );

      try {
        const generation = await generateObject({
          model: openai("o3-mini"),
          prompt: prompt({ ...moment, vtt }),
          schema: Schema,
        });

        console.log(`Processed moment ${moment.id}`);
        return {
          ...moment,
          vtt,
          result: generation.object,
        };
      } catch (error) {
        console.error(`Error processing moment ${moment.id}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    result.push(...batchResults.filter((r) => r !== null));
  }

  // Save evaluations to CSV
  const csvFilename = saveToCsv(result);
  console.log(`Evaluation results saved to ${csvFilename}`);
};

/**
 * Extracts a portion of a WebVTT file based on segment IDs
 * @param cleanVttContent The full VTT content string
 * @param startSegmentId The starting segment ID (inclusive)
 * @param endSegmentId The ending segment ID (inclusive)
 * @returns A string containing the extracted VTT content
 */
const getMomentVtt = (
  cleanVttContent: string,
  startSegmentId: number,
  endSegmentId: number,
): string => {
  // Handle invalid inputs
  if (!cleanVttContent || startSegmentId > endSegmentId) {
    return "";
  }

  // Split the VTT content into lines
  const lines = cleanVttContent.split("\n");

  // Extract the header (first two lines usually)
  const header = lines.slice(0, 2).join("\n");

  const segments: string[] = [];
  let currentSegmentId: number | null = null;
  let currentSegmentLines: string[] = [];
  let isInRange = false;

  // Process each line after the header
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    if (!line) {
      continue;
    }

    // Empty line indicates the end of a segment
    if (line.trim() === "") {
      if (currentSegmentId !== null && isInRange) {
        segments.push(currentSegmentLines.join("\n"));
      }
      currentSegmentId = null;
      currentSegmentLines = [];
      continue;
    }

    // Try to parse the line as a segment ID
    if (currentSegmentId === null) {
      const parsedId = Number.parseInt(line.trim(), 10);
      if (!Number.isNaN(parsedId)) {
        currentSegmentId = parsedId;
        isInRange = parsedId >= startSegmentId && parsedId <= endSegmentId;
        currentSegmentLines.push(line);
      }
    } else {
      // Add the line to the current segment
      currentSegmentLines.push(line);
    }
  }

  // Handle the last segment if needed
  if (currentSegmentId !== null && isInRange) {
    segments.push(currentSegmentLines.join("\n"));
  }

  // Combine header and selected segments
  return `${header}\n\n${segments.join("\n\n")}`;
};

main();
