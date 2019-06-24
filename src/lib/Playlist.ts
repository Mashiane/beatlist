import SongData from '@/lib/SongData';
import fs from 'fs';
import {promisify} from 'util';
import crypto from 'crypto';
import path from 'path';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const renameFile = promisify(fs.rename);

export default class Playlist {

  public static async Parse(pathToJson: string, songs: SongData[]): Promise<Playlist> {
    const raw = await readFile(pathToJson);
    const data = JSON.parse(raw.toString());

    const playlist = new Playlist();
    playlist.playlistPath = pathToJson;
    playlist.playlistTitle = data.playlistTitle;
    playlist.playlistAuthor = data.playlistAuthor;
    playlist.playlistDescription = data.playlistDescription;

    playlist.playlistHash = this.getPlaylistHash(playlist.playlistPath);

    playlist.songs = data.songs.map((s: any) => {
      return (
        SongData.GetSongFromKey(s.key, songs) ||
        SongData.GetSongFromHash(s.hash, songs) ||
        SongData.GetSongFromDirId(s.key, songs)
      );
    }).filter((s: any) => s !== undefined && s.valid);

    return playlist;
  }

  public static async LoadCover(playlistPath: string): Promise<string> {
    const raw = await readFile(playlistPath);
    const data = JSON.parse(raw.toString());
    return data.image;
  }

  private static getPlaylistHash(playlistPath: string): string {
    return crypto
      .createHash('sha1')
      .update(playlistPath)
      .digest('hex')
      .substr(0, 5);
  }

  public playlistHash: string = '';
  public playlistPath: string = '';
  public playlistTitle: string = '';
  public playlistAuthor: string = '';
  public playlistDescription: string = '';

  public songs: SongData[] = [];

  public async Save(image: string) {
    await this.EnsureJsonExtensionName();
    await writeFile(this.playlistPath, this.ExportJson(image));
  }

  public CalculateHash() {
    this.playlistHash = Playlist.getPlaylistHash(this.playlistPath);
  }

  private async EnsureJsonExtensionName() {
    if (path.extname(this.playlistPath) !== '.json') {
      const dataPath = path.parse(this.playlistPath);
      const fixedPath = path.join(dataPath.dir, dataPath.name + '.json');
      await renameFile(this.playlistPath, fixedPath);

      this.playlistPath = fixedPath;
      this.CalculateHash();
    }
  }

  private ExportJson(img: string): string {
    const data = {
      playlistTitle: this.playlistTitle,
      playlistAuthor: this.playlistAuthor,
      playlistDescription: this.playlistDescription,
      image: img,
      songs: this.songs
        .filter((s) => s.valid)
        .map((s) => ({
          songName: s.songName,
          hash: s.songHash,
        })),
    };

    return JSON.stringify(data);
  }
}