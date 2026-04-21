import { Module } from "@nestjs/common";

import { PlatformBootstrapSeedService } from "./platform-bootstrap-seed.service";

@Module({
  providers: [PlatformBootstrapSeedService],
})
export class SeedsModule {}
