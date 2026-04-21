export type AuthUserDto = {
  id: string;
  email: string;
};

export type AuthResponseDto = {
  accessToken: string;
  user: AuthUserDto;
};
