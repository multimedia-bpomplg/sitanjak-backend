import axios from "axios";

export const verifyCaptcha = async (token: string): Promise<boolean> => {
  try {
    const res = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: process.env.CLOUDFLARE_SECRET_KEY as string,
        response: token,
      })
    );

    return res.data.success === true;
  } catch (error) {
    console.error("Captcha verification failed", error);
    return false;
  }
};
