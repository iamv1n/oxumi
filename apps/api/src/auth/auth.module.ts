import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { MailService } from "./mail.service";
import { PasswordReset } from "./password-reset.entity";
import { Session } from "./session.entity";
import { User } from "./user.entity";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Session, PasswordReset])],
  controllers: [AuthController],
  providers: [AuthService, MailService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService, MailService],
})
export class AuthModule {}
