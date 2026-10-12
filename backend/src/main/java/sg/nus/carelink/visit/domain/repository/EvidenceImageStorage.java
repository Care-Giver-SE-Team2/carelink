package sg.nus.carelink.visit.domain.repository;

public interface EvidenceImageStorage {
    record Prepared(String fileName,String contentType,byte[] bytes,String originalHash,String storedHash) {
        public Prepared { bytes=bytes.clone(); }
        @Override public byte[] bytes() { return bytes.clone(); }
        @Override public String toString() { return "Prepared evidence image"; }
    }
    Prepared prepare(String filename,String declaredType,byte[] source);
    String save(Prepared image);
    byte[] read(String key);
    boolean available(String key);
    void discard(String key);
}
