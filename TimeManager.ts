
export class TimeManager {

  public readonly lastTime: Date | null;
  public readonly lastTimeFm: string | null;
  public readonly lastTimeFmNotNull: string;

  public readonly now: Date;
  public readonly nowFm: string;


  constructor(
    private readonly lastSentTimeString: string
  ) {
    this.lastTime = lastSentTimeString ? new Date(lastSentTimeString) : null;

    // Formatted
    this.lastTimeFm = this.lastTime && TimeManager.toYYYMMDDWithTime(this.lastTime);
    this.now = new Date();
    this.nowFm = TimeManager.toYYYMMDDWithTime(this.now);

    this.lastTimeFmNotNull = this.lastTimeFm ? this.lastTimeFm : 'Initial Commit';
  }

  private static toYYYMMDD = (date: Date) => {
    function zeroPad(number: number) {
      return number > 9 ? number : `0${number}`;
    }
    return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1)}-${zeroPad(date.getDate())}`;
  }

  private static toYYYMMDDWithTime = (date: Date) => {
    function zeroPad(number: number) {
      return number > 9 ? number : `0${number}`;
    }

    return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1)}-${zeroPad(date.getDate())} ${date.getHours()}:${date.getMinutes()}`;
  }

}