import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppConfig } from "./config";
import { ProviderCredential } from "./credentials/credential.entity";
import { CredentialsService } from "./credentials/credentials.service";
import { LlmRegistry } from "./llm/registry";
import { SpeechRegistry } from "./speech/registry";


// The pieces every feature needs: configuration, the credential store, and
// the registries that turn a project's keys into model and speech clients.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProviderCredential])],
  providers: [AppConfig, CredentialsService, LlmRegistry, SpeechRegistry],
  exports: [AppConfig, CredentialsService, LlmRegistry, SpeechRegistry],
})
export class ProvidersModule {}
