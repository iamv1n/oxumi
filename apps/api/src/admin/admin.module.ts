import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../auth/user.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

// The operator console's API: every account, its projects and usage, roles,
// and signing in as a user. Admins only (AdminGuard).
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
