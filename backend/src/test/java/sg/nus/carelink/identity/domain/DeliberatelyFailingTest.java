package sg.nus.carelink.identity.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** DELIBERATE FAULT - pipeline verification only. */
class DeliberatelyFailingTest {

	@Test
	void thisAssertionIsSupposedToFail() {
		assertThat(1 + 1).isEqualTo(3);
	}
}
