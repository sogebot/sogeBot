declare namespace Types {
  export namespace Carousel {
    export type Item = {
      id: string; type: string; base64: string;
      waitBefore: number; waitAfter: number; duration: number;
      animationInDuration: number; animationIn: string; animationOutDuration: number;
      animationOut: string; order: number; showOnlyOncePerStream: boolean;
    }
  }
}