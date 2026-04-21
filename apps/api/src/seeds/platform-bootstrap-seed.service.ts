import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import { seedPlatformBootstrap } from "./platform-bootstrap.seed";

@Injectable()
export class PlatformBootstrapSeedService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await seedPlatformBootstrap(this.dataSource);
  }
}
