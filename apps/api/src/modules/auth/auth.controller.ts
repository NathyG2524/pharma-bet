import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
// biome-ignore lint/style/useImportType: DTO classes must be concrete for ValidationPipe metadata
import { LoginDto } from "./dto/login.dto";
// biome-ignore lint/style/useImportType: DTO classes must be concrete for ValidationPipe metadata
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
