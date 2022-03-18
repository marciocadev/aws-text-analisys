import {
  ComprehendClient,
  DetectDominantLanguageCommand,
  DetectDominantLanguageCommandInput,
} from "@aws-sdk/client-comprehend";

const comprehendClient = new ComprehendClient({
  region: process.env.AWS_DEFAULT_REGION || "us-east-1",
});

export const handler = async (event: any) => {
  const { txt } = event;
  let languages;

  try {
    const params: DetectDominantLanguageCommandInput = {
      Text: txt,
    };
    const command = new DetectDominantLanguageCommand(params);
    const result = await comprehendClient.send(command);
    languages = result.Languages;
  } catch (err) {
    console.log(err);
  }
  return {
    txt: txt,
    languages: languages,
  };
};
