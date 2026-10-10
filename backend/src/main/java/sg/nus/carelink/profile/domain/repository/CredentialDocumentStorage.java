package sg.nus.carelink.profile.domain.repository;

/** Bounded inputs only; implementations keep files outside public/static resources. */
public interface CredentialDocumentStorage {
    record Upload(String fileName, String contentType, byte[] bytes) { }
    record Prepared(String fileName, String contentType, byte[] bytes, String originalHash) { }
    Prepared prepare(Upload upload);
    String save(Prepared document);
    byte[] read(String storageKey);
    boolean available(String storageKey);
    void discard(String storageKey);
}
